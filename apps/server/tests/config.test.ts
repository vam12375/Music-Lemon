import { describe, it, expect } from "vitest";
import { config } from "../src/config";

describe("config", () => {
  it("提供合理的默认值", () => {
    expect(config.baseUrl).toBe("https://tunehub.sayqz.com/api");
    expect(config.cacheTtl).toBe(300_000);
    expect(config.cacheMax).toBe(500);
    expect(config.corsOrigin).toBe("http://localhost:5173");
    expect(config.upstreamTimeout).toBe(8000);
  });
});
