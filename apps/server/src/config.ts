import "dotenv/config";

export const config = {
  /** 上游 TuneHub API Key */
  apiKey: process.env.TUNEHUB_API_KEY ?? "",
  /** 上游 Base URL */
  baseUrl: process.env.TUNEHUB_BASE_URL ?? "https://tunehub.sayqz.com/api",
  /** 缓存 TTL（毫秒） */
  cacheTtl: Number(process.env.CACHE_TTL_MS ?? 300_000),
  /** 缓存最大条目数 */
  cacheMax: Number(process.env.CACHE_MAX_ITEMS ?? 500),
  /** CORS 允许来源 */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  /** 上游请求超时（毫秒） */
  upstreamTimeout: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 8000),
};
