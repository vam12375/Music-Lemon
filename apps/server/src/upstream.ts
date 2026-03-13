import { config } from "./config";
import { AppError } from "./errors";

interface UpstreamResponse {
  code: number;
  data?: unknown;
  message?: string;
}

/**
 * 调用上游 TuneHub API
 * @param path - 路径，如 /v1/methods/netease/search
 * @param options - fetch 选项（method/body/headers）
 * @param retryOnGet - GET 请求失败时是否重试一次
 */
export async function callUpstream(
  path: string,
  options: RequestInit = {},
  retryOnGet = false,
): Promise<UpstreamResponse> {
  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    "X-API-Key": config.apiKey,
    ...(options.headers as Record<string, string> ?? {}),
  };

  const fetchOpts: RequestInit = {
    ...options,
    headers,
    signal: AbortSignal.timeout(config.upstreamTimeout),
  };

  let res: Response;
  try {
    res = await fetch(url, fetchOpts);
  } catch (err) {
    // GET 请求重试一次
    if (retryOnGet && (!options.method || options.method === "GET")) {
      try {
        res = await fetch(url, {
          ...fetchOpts,
          signal: AbortSignal.timeout(config.upstreamTimeout),
        });
      } catch {
        throw new AppError(504, 504, "上游请求超时");
      }
    } else {
      throw new AppError(504, 504, "上游请求超时");
    }
  }

  // 上游 HTTP 错误优先按状态返回
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    throw new AppError(res.status, res.status, `上游返回 ${res.status}`);
  }
  if (res.status >= 500) {
    throw new AppError(res.status, res.status, `上游服务异常 ${res.status}`);
  }

  // 解析响应
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // 非 JSON 响应直接返回文本
    const text = await res.text();
    return { code: 0, data: text };
  }

  const body = (await res.json()) as UpstreamResponse;

  // 上游 200 但 code 非 0 时映射错误
  if (body.code !== 0) {
    if (body.code === -2) {
      throw new AppError(402, -2, body.message ?? "积分不足");
    }
    if (body.code === -1) {
      throw new AppError(500, -1, body.message ?? "上游通用错误");
    }
    throw new AppError(502, body.code, body.message ?? "上游返回非零 code");
  }

  return body;
}

/**
 * 执行上游平台请求（根据方法配置发起 HTTP 请求）
 */
export async function executeUpstreamMethod(
  methodConfig: {
    method: string;
    url: string;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
  retry = false,
): Promise<{ raw: unknown; contentType: string }> {
  let targetUrl = methodConfig.url;
  const reqHeaders: Record<string, string> = { ...(methodConfig.headers ?? {}) };

  // GET 请求组装 query
  if (methodConfig.method.toUpperCase() === "GET" && methodConfig.params) {
    const qs = new URLSearchParams(methodConfig.params).toString();
    targetUrl += (targetUrl.includes("?") ? "&" : "?") + qs;
  }

  const fetchOpts: RequestInit = {
    method: methodConfig.method.toUpperCase(),
    headers: reqHeaders,
    signal: AbortSignal.timeout(config.upstreamTimeout),
  };

  // POST 请求序列化 body
  if (methodConfig.method.toUpperCase() === "POST" && methodConfig.body) {
    const ct = reqHeaders["Content-Type"] ?? reqHeaders["content-type"] ?? "application/json";
    if (ct.includes("application/x-www-form-urlencoded")) {
      fetchOpts.body = new URLSearchParams(
        methodConfig.body as Record<string, string>,
      ).toString();
    } else {
      fetchOpts.body = JSON.stringify(methodConfig.body);
      if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
        reqHeaders["Content-Type"] = "application/json";
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, fetchOpts);
  } catch {
    if (retry && methodConfig.method.toUpperCase() === "GET") {
      try {
        res = await fetch(targetUrl, {
          ...fetchOpts,
          signal: AbortSignal.timeout(config.upstreamTimeout),
        });
      } catch {
        throw new AppError(504, 504, "上游平台请求超时");
      }
    } else {
      throw new AppError(504, 504, "上游平台请求超时");
    }
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const raw = await res.json();
    return { raw, contentType };
  }
  const raw = await res.text();
  return { raw, contentType };
}
