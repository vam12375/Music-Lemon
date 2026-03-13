import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { cacheClear } from "../src/cache";

// mock upstream
vi.mock("../src/upstream", () => ({
  callUpstream: vi.fn(),
  executeUpstreamMethod: vi.fn(),
}));

import { callUpstream, executeUpstreamMethod } from "../src/upstream";
import { createApp } from "../src/app";

const mockCallUpstream = vi.mocked(callUpstream);
const mockExecute = vi.mocked(executeUpstreamMethod);

describe("POST /api/exec", () => {
  beforeEach(() => {
    mockCallUpstream.mockReset();
    mockExecute.mockReset();
    cacheClear();
  });

  it("缺少 platform 或 function 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/exec").send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it("不支持的 function 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/exec").send({
      platform: "netease",
      function: "unknown_method",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("不支持的 function");
  });

  it("白名单以外的 params 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/exec").send({
      platform: "netease",
      function: "search",
      params: { keyword: "test", forbidden: "val" },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("不允许参数");
  });

  it("search 缺少 keyword 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/exec").send({
      platform: "netease",
      function: "search",
      params: { page: 1 },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("keyword");
  });

  it("search 成功执行并返回数据", async () => {
    // mock 获取方法配置
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: {
        type: "http",
        method: "GET",
        url: "http://example.com/search",
        params: { kw: "{{keyword}}", p: "{{page}}", s: "{{pageSize}}" },
        headers: { "User-Agent": "test" },
      },
    });
    // mock 执行上游请求
    mockExecute.mockResolvedValueOnce({
      raw: { result: { songs: [{ id: 1, name: "Song" }] } },
      contentType: "application/json; charset=utf-8",
    });

    const app = createApp();
    const res = await request(app).post("/api/exec").send({
      platform: "netease",
      function: "search",
      params: { keyword: "周杰伦" },
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.raw.result.songs).toHaveLength(1);
    expect(res.body.data.platform).toBe("netease");
    expect(res.body.data.function).toBe("search");

    // 验证默认值被填充
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ p: "1", s: "30" }),
      }),
      true,
    );
  });

  it("toplists 无参数也能执行", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: {
        type: "http",
        method: "GET",
        url: "http://example.com/toplists",
        params: {},
        headers: {},
      },
    });
    mockExecute.mockResolvedValueOnce({
      raw: { list: [] },
      contentType: "application/json",
    });

    const app = createApp();
    const res = await request(app).post("/api/exec").send({
      platform: "qq",
      function: "toplists",
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it("缓存命中时不再调用上游", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: {
        type: "http",
        method: "GET",
        url: "http://example.com/toplists",
        params: {},
        headers: {},
      },
    });
    mockExecute.mockResolvedValueOnce({
      raw: { cached: true },
      contentType: "application/json",
    });

    const app = createApp();
    // 第一次
    await request(app).post("/api/exec").send({
      platform: "netease",
      function: "toplists",
    });
    // 第二次（缓存命中）
    const res = await request(app).post("/api/exec").send({
      platform: "netease",
      function: "toplists",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.raw).toEqual({ cached: true });
    expect(mockCallUpstream).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
