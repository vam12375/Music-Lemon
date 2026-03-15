import { Router } from "express";
import { callUpstream, executeUpstreamMethod } from "../upstream";
import { buildCacheKey, cacheGet, cacheSet } from "../cache";
import { AppError } from "../errors";

export const execRouter = Router();

/** 允许的 function 白名单 */
const ALLOWED_FUNCTIONS = new Set(["search", "toplists", "toplist", "playlist"]);

/** 各 function 允许的模板变量白名单 */
const PARAM_WHITELIST: Record<string, Set<string>> = {
  search: new Set(["keyword", "page", "pageSize"]),
  toplists: new Set(),
  toplist: new Set(["id"]),
  playlist: new Set(["id"]),
};

/** 参数别名映射：前端参数名 → 上游模板变量名 */
const PARAM_ALIASES: Record<string, Record<string, string>> = {
  search: { pageSize: "limit" },
};

/** 各 function 的必填参数 */
const REQUIRED_PARAMS: Record<string, string[]> = {
  search: ["keyword"],
  toplists: [],
  toplist: ["id"],
  playlist: ["id"],
};

/** 默认值 */
const DEFAULT_VALUES: Record<string, Record<string, string>> = {
  search: { page: "1", pageSize: "30" },
};

/**
 * 求值模板表达式，支持简单变量和 JS 表达式
 * 如 {{keyword}}、{{page || 1}}、{{((page || 1) - 1) * (limit || 20)}}
 */
function evaluateExpr(expr: string, vars: Record<string, string>): string {
  const trimmed = expr.trim();

  // 简单变量：直接查表
  if (/^\w+$/.test(trimmed)) {
    return vars[trimmed] ?? "";
  }

  // 复杂表达式：使用 new Function 安全求值
  try {
    const fn = new Function(...buildEvalArgs(vars, trimmed));
    return String(fn());
  } catch {
    return "";
  }
}

/**
 * 求值模板表达式，保留原始类型（数字不转字符串）
 * 用于 JSON body 中需要保持类型的场景
 */
function evaluateExprTyped(expr: string, vars: Record<string, string>): unknown {
  const trimmed = expr.trim();

  // 简单变量：查表后尝试还原数字类型
  if (/^\w+$/.test(trimmed)) {
    const val = vars[trimmed] ?? "";
    const num = Number(val);
    return val !== "" && !Number.isNaN(num) ? num : val;
  }

  // 复杂表达式：返回原始求值结果
  try {
    const fn = new Function(...buildEvalArgs(vars, trimmed));
    return fn();
  } catch {
    return "";
  }
}

/** 构建 new Function 的参数：变量声明 + return 语句 */
function buildEvalArgs(vars: Record<string, string>, expr: string): [string] {
  const varDecls = Object.entries(vars)
    .map(([k, v]) => {
      const num = Number(v);
      return `var ${k} = ${Number.isNaN(num) ? JSON.stringify(v) : num};`;
    })
    .join(" ");
  return [`${varDecls} return (${expr});`];
}

/**
 * 替换模板变量 {{...}}，支持简单变量和 JS 表达式
 */
function replaceTemplateVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => evaluateExpr(expr, vars));
}

/**
 * 递归替换对象中所有字符串值的模板变量
 */
function replaceInObject(
  obj: Record<string, unknown>,
  vars: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = replaceTemplateVars(value, vars);
    } else if (typeof value === "object" && value !== null) {
      // 递归处理嵌套对象（如 QQ 平台的 body 结构）
      result[key] = JSON.stringify(
        replaceInNestedObject(value as Record<string, unknown>, vars),
      );
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * 递归替换嵌套对象中的模板变量，保留对象结构和类型
 * 当整个值是单一模板 {{expr}} 时，保留表达式的原始类型（数字/字符串）
 */
function replaceInNestedObject(
  obj: Record<string, unknown>,
  vars: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // 如果整个值是一个模板表达式，保留原始类型
      const singleExpr = value.match(/^\{\{(.+?)\}\}$/);
      if (singleExpr) {
        result[key] = evaluateExprTyped(singleExpr[1], vars);
      } else {
        result[key] = replaceTemplateVars(value, vars);
      }
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = replaceInNestedObject(value as Record<string, unknown>, vars);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** 已知安全的 JS 关键词（非变量引用） */
const JS_SAFE_TOKENS = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity",
  "function", "return", "var", "let", "const", "if", "else",
  "Math", "String", "Number", "parseInt", "parseFloat",
]);

/**
 * 检查方法配置中是否包含白名单以外的变量引用
 */
function findExtraPlaceholders(
  config: { url?: string; params?: Record<string, unknown>; body?: Record<string, unknown>; headers?: Record<string, unknown> },
  allowedVars: Set<string>,
): string[] {
  const extra: string[] = [];
  const allText = JSON.stringify(config);
  // 匹配所有 {{...}} 模板
  const templates = allText.matchAll(/\{\{(.+?)\}\}/g);
  for (const tm of templates) {
    // 从表达式中提取标识符
    const identifiers = tm[1].match(/[a-zA-Z_]\w*/g) ?? [];
    for (const id of identifiers) {
      if (!allowedVars.has(id) && !JS_SAFE_TOKENS.has(id) && !extra.includes(id)) {
        extra.push(id);
      }
    }
  }
  return extra;
}

execRouter.post("/", async (req, res, next) => {
  try {
    const { platform, function: fn, params: userParams = {} } = req.body;

    // 校验必填字段
    if (!platform || !fn) {
      throw new AppError(400, 400, "缺少 platform 或 function");
    }

    const fnLower = String(fn).toLowerCase();
    const platformLower = String(platform).toLowerCase();

    // 校验 function 白名单
    if (!ALLOWED_FUNCTIONS.has(fnLower)) {
      throw new AppError(400, 400, `不支持的 function: ${fn}`);
    }

    // 校验 params 白名单
    const allowedParams = PARAM_WHITELIST[fnLower];
    for (const key of Object.keys(userParams)) {
      if (!allowedParams.has(key)) {
        throw new AppError(400, 400, `function ${fnLower} 不允许参数: ${key}`);
      }
    }

    // 补齐默认值
    const defaults = DEFAULT_VALUES[fnLower] ?? {};
    const mergedParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaults)) {
      mergedParams[k] = v;
    }
    for (const [k, v] of Object.entries(userParams)) {
      mergedParams[k] = String(v);
    }

    // 校验必填参数
    const required = REQUIRED_PARAMS[fnLower];
    for (const r of required) {
      if (!mergedParams[r]) {
        throw new AppError(400, 400, `function ${fnLower} 缺少必填参数: ${r}`);
      }
    }

    // 应用参数别名映射（如 pageSize → limit），供模板表达式求值使用
    const aliases = PARAM_ALIASES[fnLower] ?? {};
    const templateVars: Record<string, string> = { ...mergedParams };
    for (const [from, to] of Object.entries(aliases)) {
      if (templateVars[from] !== undefined && templateVars[to] === undefined) {
        templateVars[to] = templateVars[from];
      }
    }

    // 构建扩展白名单（包含别名目标变量）
    const extendedAllowed = new Set(allowedParams);
    for (const alias of Object.values(aliases)) {
      extendedAllowed.add(alias);
    }

    // 缓存检查
    const cacheKey = buildCacheKey({
      route: "exec",
      platform: platformLower,
      function: fnLower,
      params: mergedParams,
    });
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      res.json(cached);
      return;
    }

    // 获取上游方法配置
    const methodRes = await callUpstream(
      `/v1/methods/${platformLower}/${fnLower}`,
      { method: "GET" },
      true,
    );
    const methodConfig = methodRes.data as {
      type: string;
      method: string;
      url: string;
      params?: Record<string, unknown>;
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    };

    if (!methodConfig || !methodConfig.url) {
      throw new AppError(404, 404, "上游方法配置缺失");
    }

    // 检查是否包含白名单以外的占位符
    const extraVars = findExtraPlaceholders(methodConfig, extendedAllowed);
    if (extraVars.length > 0) {
      throw new AppError(400, 400, `方法配置含有不支持的占位符: ${extraVars.join(", ")}`);
    }

    // 替换模板变量（支持 JS 表达式）
    const resolvedUrl = replaceTemplateVars(methodConfig.url, templateVars);
    const resolvedParams = methodConfig.params
      ? replaceInObject(methodConfig.params as Record<string, unknown>, templateVars)
      : undefined;
    const resolvedBody = methodConfig.body
      ? replaceInNestedObject(methodConfig.body as Record<string, unknown>, templateVars)
      : undefined;
    const resolvedHeaders = methodConfig.headers
      ? replaceInObject(methodConfig.headers as Record<string, unknown>, templateVars)
      : undefined;

    // 执行上游平台请求
    const { raw, contentType } = await executeUpstreamMethod(
      {
        method: methodConfig.method,
        url: resolvedUrl,
        params: resolvedParams,
        body: resolvedBody as Record<string, unknown> | undefined,
        headers: resolvedHeaders,
      },
      true,
    );

    const response = {
      code: 0,
      message: "ok",
      data: { raw, contentType, platform: platformLower, function: fnLower },
    };

    // 仅缓存平台正常响应，跳过含错误码的响应
    const rawObj = raw as Record<string, unknown> | null;
    const platformCode = rawObj?.code;
    const isError = typeof platformCode === "number" && platformCode !== 0 && platformCode !== 200;
    if (!isError) {
      cacheSet(cacheKey, response);
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});
