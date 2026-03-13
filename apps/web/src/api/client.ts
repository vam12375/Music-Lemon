import type { Platform, Quality } from "@/types";

const BASE = "/api";

/** 带状态码的 API 错误 */
export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

/** 通用请求封装，自动处理错误码 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  if (body.code !== 0) {
    throw new ApiError(
      res.status !== 200 ? res.status : body.code,
      body.message || `请求失败 (code: ${body.code})`,
    );
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

/** 获取歌曲详情（免费，不消耗积分） */
export async function songDetail(platform: Platform, id: string) {
  return request<{
    id: string;
    platform: string;
    title: string;
    artist: string;
    cover: string;
    album: string;
    duration: number;
  }>(`/detail/${platform}/${id}`);
}
