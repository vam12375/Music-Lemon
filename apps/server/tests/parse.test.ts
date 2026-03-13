import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { cacheClear } from "../src/cache";

// mock 上游调用
vi.mock("../src/upstream", () => ({
  callUpstream: vi.fn(),
  executeUpstreamMethod: vi.fn(),
}));

import { callUpstream } from "../src/upstream";
import { createApp } from "../src/app";

const mockCallUpstream = vi.mocked(callUpstream);

describe("POST /api/parse", () => {
  beforeEach(() => {
    mockCallUpstream.mockReset();
    cacheClear();
  });

  // ---- 1. 缺少 platform 或 ids 返回 400 ----
  it("缺少 platform 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/parse").send({ ids: "123" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toContain("platform");
  });

  it("缺少 ids 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/parse").send({ platform: "netease" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toContain("ids");
  });

  it("ids 为空字符串返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/parse").send({ platform: "netease", ids: "" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  // ---- 2. 未知平台返回 400 ----
  it("未知平台返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "spotify",
      ids: "123",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("不支持的平台");
  });

  // ---- 3. 无效 quality 返回 400 ----
  it("无效 quality 返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "mp3",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("无效的 quality");
  });

  // ---- 4. ids 超过 50 个返回 400 ----
  it("ids 超过 50 个返回 400", async () => {
    const app = createApp();
    const manyIds = Array.from({ length: 51 }, (_, i) => String(i + 1)).join(",");
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: manyIds,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("50");
  });

  // ---- 5. ids 去重与规范化 ----
  it("ids 去重并去空白", async () => {
    // mock：批量返回 3 个结果
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: [
        { id: "111", url: "http://example.com/111.mp3" },
        { id: "222", url: "http://example.com/222.mp3" },
        { id: "333", url: "http://example.com/333.mp3" },
      ],
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: " 111 , 222 , 111 , , 333 ",
    });

    expect(res.status).toBe(200);
    // 去重后应为 3 个 id
    expect(res.body.data.items).toHaveLength(3);
    // 批量调用上游 1 次
    expect(mockCallUpstream).toHaveBeenCalledTimes(1);
  });

  it("ids 为数组输入时也能正确规范化", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: [
        { id: "111", url: "http://example.com/111.mp3" },
        { id: "222", url: "http://example.com/222.mp3" },
        { id: "333", url: "http://example.com/333.mp3" },
      ],
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: ["111,222", "333"],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
  });

  it("ids 规范化后为空返回 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: " , , , ",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("为空");
  });

  // ---- 6. 成功解析单曲 ----
  it("成功解析单曲并返回正确结构", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: {
        id: "1974443814",
        url: "http://example.com/song.flac",
        lyric: "[00:01.00]第一行歌词\n[00:05.50]第二行歌词",
      },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "1974443814",
      quality: "flac24bit",
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe("ok");
    const item = res.body.data.items[0];
    expect(item.ok).toBe(true);
    expect(item.url).toBe("http://example.com/song.flac");
    expect(item.platform).toBe("netease");
    expect(item.quality).toBe("flac24bit");
    // 歌词应被解析为 JSON 字符串
    expect(item.lyric).toBeDefined();
    const lyrics = JSON.parse(item.lyric);
    expect(lyrics).toHaveLength(2);
    expect(lyrics[0].time).toBe(1);
    expect(lyrics[0].text).toBe("第一行歌词");
  });

  it("默认 quality 为 flac24bit", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { id: "123", url: "http://example.com/song.flac" },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
    });

    expect(res.status).toBe(200);
    // 验证上游被调用时 quality 为 flac24bit
    expect(mockCallUpstream).toHaveBeenCalledWith(
      "/v1/parse",
      expect.objectContaining({
        body: expect.stringContaining("flac24bit"),
      }),
    );
  });

  // ---- 7. 部分失败（ok=false） ----
  it("部分 id 解析失败时返回混合结果", async () => {
    // 批量返回：第一个有 url，第二个无 url
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: [
        { id: "111", url: "http://example.com/111.flac" },
        { id: "222" }, // 无 url
      ],
    });
    // 降级重试时对 222 也都失败
    mockCallUpstream.mockResolvedValue({
      code: 0,
      data: { id: "222" }, // 无 url
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "111,222",
      quality: "flac24bit",
    });

    expect(res.status).toBe(200);
    const items = res.body.data.items;
    expect(items).toHaveLength(2);
    // 第一个成功
    expect(items[0].ok).toBe(true);
    expect(items[0].url).toBeDefined();
    // 第二个失败，附带尝试过的音质列表
    expect(items[1].ok).toBe(false);
    expect(items[1].qualitiesTried).toBeDefined();
    expect(items[1].qualitiesTried).toEqual(["flac24bit", "flac", "320k", "128k"]);
  });

  // ---- 8. 质量自动降级 ----
  it("首选音质无可用 url 时自动降级", async () => {
    // flac24bit 无 url
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { id: "123" }, // 无 url
    });
    // flac 也无 url
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { id: "123" }, // 无 url
    });
    // 320k 成功
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { id: "123", url: "http://example.com/123.mp3" },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "flac24bit",
    });

    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(item.ok).toBe(true);
    expect(item.quality).toBe("320k");
    expect(item.url).toBe("http://example.com/123.mp3");
    // 应该调用了 3 次上游
    expect(mockCallUpstream).toHaveBeenCalledTimes(3);
  });

  // ---- 9. 缓存命中不再调用上游 ----
  it("缓存命中时不再调用上游", async () => {
    mockCallUpstream.mockResolvedValue({
      code: 0,
      data: { id: "123", url: "http://example.com/123.flac" },
    });

    const app = createApp();
    // 第一次请求
    await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "flac24bit",
    });

    const firstCallCount = mockCallUpstream.mock.calls.length;

    // 第二次请求（相同参数，应命中缓存）
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "flac24bit",
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    // 调用次数应保持不变
    expect(mockCallUpstream).toHaveBeenCalledTimes(firstCallCount);
  });

  // ---- 10. 上游数据兼容（data 为对象/数组/data.items） ----
  it("上游返回 data 为对象（含 url）时作为单曲处理", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { id: "123", url: "http://example.com/123.flac", lyric: "[00:00.00]Hello" },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "flac",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].ok).toBe(true);
  });

  it("上游返回 data 为数组时逐项处理", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: [
        { id: "111", url: "http://example.com/111.flac" },
        { id: "222", url: "http://example.com/222.flac" },
      ],
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "qq",
      ids: "111,222",
      quality: "flac",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].ok).toBe(true);
    expect(res.body.data.items[1].ok).toBe(true);
  });

  it("上游返回 data.items 为数组时逐项处理", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: {
        items: [
          { id: "111", url: "http://example.com/111.flac" },
          { id: "222" }, // 无 url
        ],
      },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "kuwo",
      ids: "111,222",
      quality: "flac",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].ok).toBe(true);
    expect(res.body.data.items[1].ok).toBe(false);
  });

  it("上游返回无法识别的结构时所有 id 标记为失败", async () => {
    mockCallUpstream.mockResolvedValue({
      code: 0,
      data: "just a string",
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "128k",
    });

    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(item.ok).toBe(false);
    expect(item.message).toContain("unrecognized response");
  });

  // ---- 歌词格式验证 ----
  it("无时间戳的歌词保留到 rawLyricText", async () => {
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: {
        id: "123",
        url: "http://example.com/123.flac",
        lyric: "这是一段纯文本歌词\n没有时间戳",
      },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "flac",
    });

    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(item.ok).toBe(true);
    expect(item.lyric).toBeUndefined();
    expect(item.rawLyricText).toBe("这是一段纯文本歌词\n没有时间戳");
  });

  // ---- 上游调用异常时继续降级 ----
  it("上游抛出异常时继续尝试下一档音质", async () => {
    // flac24bit 抛出异常
    mockCallUpstream.mockRejectedValueOnce(new Error("上游错误"));
    // flac 成功
    mockCallUpstream.mockResolvedValueOnce({
      code: 0,
      data: { id: "123", url: "http://example.com/123.flac" },
    });

    const app = createApp();
    const res = await request(app).post("/api/parse").send({
      platform: "netease",
      ids: "123",
      quality: "flac24bit",
    });

    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(item.ok).toBe(true);
    expect(item.quality).toBe("flac");
  });
});
