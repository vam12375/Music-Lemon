import { describe, it, expect, beforeEach } from "vitest";
import { buildCacheKey, cacheGet, cacheSet, cacheClear } from "../src/cache";

describe("cache", () => {
  beforeEach(() => cacheClear());

  describe("buildCacheKey", () => {
    it("key 按字母排序生成稳定键", () => {
      const a = buildCacheKey({ platform: "netease", function: "search" });
      const b = buildCacheKey({ function: "search", platform: "netease" });
      expect(a).toBe(b);
    });

    it("platform 和 function 强制小写", () => {
      const a = buildCacheKey({ platform: "Netease", function: "Search" });
      const b = buildCacheKey({ platform: "netease", function: "search" });
      expect(a).toBe(b);
    });

    it("去除 undefined/null 值", () => {
      const a = buildCacheKey({ platform: "qq", extra: undefined, nil: null });
      const b = buildCacheKey({ platform: "qq" });
      expect(a).toBe(b);
    });

    it("params 内部也按 key 排序且去除空值", () => {
      const a = buildCacheKey({ params: { pageSize: 30, keyword: "test", empty: undefined } });
      const b = buildCacheKey({ params: { keyword: "test", pageSize: 30 } });
      expect(a).toBe(b);
    });
  });

  describe("cacheGet / cacheSet", () => {
    it("缓存命中返回数据", () => {
      cacheSet("key1", { data: "hello" });
      expect(cacheGet("key1")).toEqual({ data: "hello" });
    });

    it("缓存未命中返回 undefined", () => {
      expect(cacheGet("nonexistent")).toBeUndefined();
    });
  });
});
