import { Router } from "express";
import { callUpstream } from "../upstream";
import { buildCacheKey, cacheGet, cacheSet } from "../cache";
import { AppError } from "../errors";

export const parseRouter = Router();

/** 允许的平台 */
const ALLOWED_PLATFORMS = new Set(["netease", "qq", "kuwo"]);

/** 允许的音质值 */
const ALLOWED_QUALITIES = new Set(["128k", "320k", "flac", "flac24bit"]);

/** 最大 ids 数量 */
const MAX_IDS = 50;

/**
 * 规范化 ids 输入：
 * 1. 支持字符串或数组
 * 2. 逗号分隔，去空白
 * 3. 去除空值与重复项（保留首次出现）
 */
function normalizeIds(raw: unknown): string[] {
  let items: string[];

  if (Array.isArray(raw)) {
    items = raw.flatMap((v) => String(v).split(","));
  } else if (typeof raw === "string") {
    items = raw.split(",");
  } else {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * 解析路由
 * 简化版：直接透传上游响应，上游已自带音质降级
 */
parseRouter.post("/", async (req, res, next) => {
  try {
    const { platform, ids: rawIds, quality: rawQuality } = req.body;

    // 校验 platform
    if (!platform) {
      throw new AppError(400, 400, "缺少 platform");
    }
    const platformLower = String(platform).toLowerCase();
    if (!ALLOWED_PLATFORMS.has(platformLower)) {
      throw new AppError(400, 400, `不支持的平台: ${platform}`);
    }

    // 校验 ids
    if (rawIds === undefined || rawIds === null || rawIds === "") {
      throw new AppError(400, 400, "缺少 ids");
    }

    const ids = normalizeIds(rawIds);
    if (ids.length === 0) {
      throw new AppError(400, 400, "ids 规范化后为空");
    }
    if (ids.length > MAX_IDS) {
      throw new AppError(400, 400, `ids 数量超过上限 ${MAX_IDS}`);
    }

    // 校验 quality
    const quality = rawQuality ? String(rawQuality) : "flac24bit";
    if (!ALLOWED_QUALITIES.has(quality)) {
      throw new AppError(400, 400, `无效的 quality: ${quality}`);
    }

    // 缓存检查
    const idsString = ids.join(",");
    const cacheKey = buildCacheKey({
      route: "parse",
      platform: platformLower,
      ids: idsString,
      quality,
    });
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      res.json(cached);
      return;
    }

    // 直接调用上游，上游已自带音质降级，无需我们重复处理
    const upstream = await callUpstream("/v1/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: platformLower, ids: idsString, quality }),
    });

    // 透传上游响应，保留所有字段（info、cover、fileSize、actualQuality 等）
    const response = {
      code: 0,
      message: "ok",
      data: upstream.data,
    };

    // 写入缓存
    cacheSet(cacheKey, response);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
