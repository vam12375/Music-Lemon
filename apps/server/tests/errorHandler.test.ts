import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { AppError } from "../src/errors";

// mock upstream 以避免实际网络请求
vi.mock("../src/upstream", () => ({
  callUpstream: vi.fn(),
  executeUpstreamMethod: vi.fn(),
}));

describe("全局错误处理", () => {
  it("AppError 返回对应状态码和业务 code", async () => {
    const { callUpstream } = await import("../src/upstream");
    vi.mocked(callUpstream).mockRejectedValueOnce(
      new AppError(402, -2, "积分不足"),
    );

    const app = createApp();
    const res = await request(app).get("/api/methods");

    expect(res.status).toBe(402);
    expect(res.body).toEqual({ code: -2, message: "积分不足" });
  });

  it("AppError 携带 details 时一并返回", async () => {
    const { callUpstream } = await import("../src/upstream");
    vi.mocked(callUpstream).mockRejectedValueOnce(
      new AppError(400, 400, "参数错误", { field: "ids" }),
    );

    const app = createApp();
    const res = await request(app).get("/api/methods");

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual({ field: "ids" });
  });

  it("未知错误返回 500", async () => {
    const { callUpstream } = await import("../src/upstream");
    vi.mocked(callUpstream).mockRejectedValueOnce(new Error("unknown"));

    const app = createApp();
    const res = await request(app).get("/api/methods");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe("服务器内部错误");
  });
});
