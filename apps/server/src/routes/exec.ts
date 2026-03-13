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
 * 替换模板变量 {{var}}，返回替换后的字符串
 */
function replaceTemplateVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
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
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * 检查方法配置中是否包含白名单以外的占位符
 */
function findExtraPlaceholders(
  config: { url?: string; params?: Record<string, unknown>; body?: Record<string, unknown>; headers?: Record<string, unknown> },
  allowedVars: Set<string>,
): string[] {
  const extra: string[] = [];
  const allText = JSON.stringify(config);
  const matches = allText.matchAll(/\{\{(\w+)\}\}/g);
  for (const m of matches) {
    if (!allowedVars.has(m[1]) && !extra.includes(m[1])) {
      extra.push(m[1]);
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
    const extraVars = findExtraPlaceholders(methodConfig, allowedParams);
    if (extraVars.length > 0) {
      throw new AppError(400, 400, `方法配置含有不支持的占位符: ${extraVars.join(", ")}`);
    }

    // 替换模板变量
    const resolvedUrl = replaceTemplateVars(methodConfig.url, mergedParams);
    const resolvedParams = methodConfig.params
      ? replaceInObject(methodConfig.params as Record<string, unknown>, mergedParams)
      : undefined;
    const resolvedBody = methodConfig.body
      ? replaceInObject(methodConfig.body as Record<string, unknown>, mergedParams)
      : undefined;
    const resolvedHeaders = methodConfig.headers
      ? replaceInObject(methodConfig.headers as Record<string, unknown>, mergedParams)
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
