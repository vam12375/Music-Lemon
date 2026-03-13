import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { cacheClear } from "../src/cache";

// mock upstream 的 callUpstream
vi.mock("../src/upstream", () => ({
  callUpstream: vi.fn(),
}));

import { callUpstream } from "../src/upstream";
import { createApp } from "../src/app";

const mockCallUpstream = vi.mocked(callUpstream);

describe("GET /api/methods*", () => {
  beforeEach(() => {
    mockCallUpstream.mockReset();
    cacheClear();
  });

  it("GET /api/methods 透传上游数据", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { netease: ["search", "toplists"], qq: ["search"] },
    });

    const app = createApp();
    const res = await request(app).get("/api/methods");

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toEqual({
      netease: ["search", "toplists"],
      qq: ["search"],
    });
  });

  it("GET /api/methods/:platform 透传上游数据", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: ["search", "toplists", "toplist", "playlist"],
    });

    const app = createApp();
    const res = await request(app).get("/api/methods/netease");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(["search", "toplists", "toplist", "playlist"]);
    // 验证调用上游路径正确
    expect(mockCallUpstream).toHaveBeenCalledWith(
      "/v1/methods/netease",
      { method: "GET" },
      true,
    );
  });

  it("GET /api/methods/:platform/:function 透传上游数据", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { type: "http", method: "GET", url: "http://example.com" },
    });

    const app = createApp();
    const res = await request(app).get("/api/methods/kuwo/search");

    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe("http");
    expect(mockCallUpstream).toHaveBeenCalledWith(
      "/v1/methods/kuwo/search",
      { method: "GET" },
      true,
    );
  });

  it("缓存命中时不再调用上游", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { cached: true },
    });

    const app = createApp();
    // 第一次请求
    await request(app).get("/api/methods");
    // 第二次请求（应命中缓存）
    const res = await request(app).get("/api/methods");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ cached: true });
    // callUpstream 只被调用一次
    expect(mockCallUpstream).toHaveBeenCalledTimes(1);
  });

  it("上游错误返回对应状态码", async () => {
    const { AppError } = await import("../src/errors");
    mockCallUpstream.mockRejectedValueOnce(
      new AppError(502, 999, "上游异常"),
    );

    const app = createApp();
    const res = await request(app).get("/api/methods");

    expect(res.status).toBe(502);
    expect(res.body.code).toBe(999);
  });
});
