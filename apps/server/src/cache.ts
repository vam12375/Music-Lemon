import { LRUCache } from "lru-cache";
import { config } from "./config";

const store = new LRUCache<string, unknown>({
  max: config.cacheMax,
  ttl: config.cacheTtl,
});

/**
 * 生成稳定的缓存键：key 排序 + platform/function 小写
 */
export function buildCacheKey(parts: Record<string, unknown>): string {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(parts).sort()) {
    let val = parts[key];
    // platform 和 function 强制小写
    if ((key === "platform" || key === "function") && typeof val === "string") {
      val = val.toLowerCase();
    }
    // 去除 undefined/null
    if (val === undefined || val === null) continue;
    // params 对象也需要排序并去除空值
    if (key === "params" && typeof val === "object" && val !== null) {
      const sortedParams: Record<string, unknown> = {};
      for (const pk of Object.keys(val as Record<string, unknown>).sort()) {
        const pv = (val as Record<string, unknown>)[pk];
        if (pv !== undefined && pv !== null) {
          sortedParams[pk] = pv;
        }
      }
      val = sortedParams;
    }
    normalized[key] = val;
  }
  return JSON.stringify(normalized);
}

export function cacheGet<T = unknown>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, value);
}

/** 清空缓存（测试用） */
export function cacheClear(): void {
  store.clear();
}
