import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppError } from "../src/errors";

// mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// 动态导入以使 mock 生效
const { callUpstream } = await import("../src/upstream");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

describe("callUpstream", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("成功返回上游数据", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: 0, data: { list: [] } }),
    );
    const result = await callUpstream("/v1/methods");
    expect(result.code).toBe(0);
    expect(result.data).toEqual({ list: [] });
  });

  it("上游 401 映射为 AppError 401", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );
    await expect(callUpstream("/v1/methods")).rejects.toSatisfy((err: unknown) => {
      return err instanceof AppError && err.statusCode === 401;
    });
  });

  it("上游 code=-2 映射为 402（积分不足）", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: -2, message: "Insufficient credits" }),
    );
    await expect(callUpstream("/v1/methods")).rejects.toMatchObject({
      statusCode: 402,
      code: -2,
    });
  });

  it("上游 code=-1 映射为 500", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: -1, message: "Error" }),
    );
    await expect(callUpstream("/v1/methods")).rejects.toMatchObject({
      statusCode: 500,
      code: -1,
    });
  });

  it("上游其他非零 code 映射为 502", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: 999, message: "unknown" }),
    );
    await expect(callUpstream("/v1/methods")).rejects.toMatchObject({
      statusCode: 502,
      code: 999,
    });
  });

  it("网络超时映射为 504", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));
    await expect(callUpstream("/v1/methods")).rejects.toMatchObject({
      statusCode: 504,
    });
  });
});
