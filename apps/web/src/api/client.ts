import type { Platform, Quality } from "@/types";

const BASE = "/api";

/** 通用请求封装，自动处理错误码 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  if (body.code !== 0) {
    throw new Error(body.message || `请求失败 (code: ${body.code})`);
  }
  return body.data as T;
}

/** 执行方法下发 */
export function exec(platform: Platform, fn: string, params: Record<string, unknown> = {}) {
  return request("/exec", {
    method: "POST",
    body: JSON.stringify({ platform, function: fn, params }),
  });
}

/** 解析歌曲 */
export function parse(platform: Platform, ids: string, quality: Quality = "flac24bit") {
  return request("/parse", {
    method: "POST",
    body: JSON.stringify({ platform, ids, quality }),
  });
}
