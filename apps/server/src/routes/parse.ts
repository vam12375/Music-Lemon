import { Router } from "express";
import { callUpstream } from "../upstream";
import { buildCacheKey, cacheGet, cacheSet } from "../cache";
import { AppError } from "../errors";

export const parseRouter = Router();

/** 允许的平台 */
const ALLOWED_PLATFORMS = new Set(["netease", "qq", "kuwo"]);

/** 允许的音质值 */
const ALLOWED_QUALITIES = new Set(["128k", "320k", "flac", "flac24bit"]);

/** 音质降级顺序 */
const QUALITY_FALLBACK_CHAIN: Record<string, string[]> = {
  flac24bit: ["flac24bit", "flac", "320k", "128k"],
  flac: ["flac", "320k", "128k"],
  "320k": ["320k", "128k"],
  "128k": ["128k"],
};

/** 单个解析结果项 */
interface ParsedItem {
  id: string;
  ok: boolean;
  url?: string;
  lyric?: string;
  rawLyricText?: string;
  platform: string;
  quality?: string;
  qualitiesTried?: string[];
  message?: string;
}

/** LRC 歌词行 */
interface LyricLine {
  time: number;
  text: string;
}

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
    // 数组输入：展开并按逗号再分隔
    items = raw.flatMap((v) => String(v).split(","));
  } else if (typeof raw === "string") {
    items = raw.split(",");
  } else {
    return [];
  }

  // 去空白、去空值、去重（保留首次出现）
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
 * 解析 LRC 歌词文本为结构化歌词行
 * 仅接受带时间戳的 LRC 格式，如 [mm:ss.xx]text
 */
function parseLrc(text: string | undefined | null): { lines: LyricLine[]; raw?: string } {
  if (!text || typeof text !== "string") {
    return { lines: [] };
  }

  const lines: LyricLine[] = [];
  // 匹配 [mm:ss.xx] 或 [mm:ss] 格式
  const lineRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

  for (const rawLine of text.split("\n")) {
    const match = rawLine.trim().match(lineRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
      const time = minutes * 60 + seconds + ms / 1000;
      lines.push({ time, text: match[4] ?? "" });
    }
  }

  // 如果没有解析出任何有效时间戳行，返回空 lines 并保留原文
  if (lines.length === 0 && text.trim().length > 0) {
    return { lines: [], raw: text };
  }

  return { lines };
}

/**
 * 构建单个解析结果项（从上游返回的单条数据中提取）
 */
function buildParsedItem(
  entry: Record<string, unknown>,
  fallbackId: string,
  platform: string,
): ParsedItem {
  const id = String(entry.id ?? fallbackId);
  const url = entry.url as string | undefined;
  const lyricResult = parseLrc(entry.lyric as string | undefined);

  const item: ParsedItem = {
    id,
    ok: !!url,
    platform,
  };
  if (url) {
    item.url = url;
  }
  if (lyricResult.lines.length > 0) {
    item.lyric = JSON.stringify(lyricResult.lines);
  }
  if (lyricResult.raw) {
    item.rawLyricText = lyricResult.raw;
  }
  if (!url) {
    item.message = "no playable url";
  }
  return item;
}

/**
 * 从上游响应中提取解析结果
 * 兼容多种上游数据结构：
 * - data 为对象且包含 url：单曲结果
 * - data 为数组：逐项读取
 * - data.items 为数组：逐项读取
 * - 其他结构：ok=false 并附 message=unrecognized response
 */
function extractItemsFromUpstream(
  data: unknown,
  ids: string[],
  platform: string,
): ParsedItem[] {
  // data 为对象（非数组）
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // data.items 为数组：优先使用 items
    if ("items" in obj && Array.isArray(obj.items)) {
      return (obj.items as Record<string, unknown>[]).map((entry, i) =>
        buildParsedItem(entry, ids[i] ?? "", platform),
      );
    }

    // data 包含 url：视为单曲结果
    if ("url" in obj) {
      return [buildParsedItem(obj, ids[0] ?? "", platform)];
    }

    // 对象但不含 url 也不含 items：不可识别
    return ids.map((id) => ({
      id,
      ok: false,
      platform,
      message: "unrecognized response",
    }));
  }

  // data 为数组：逐项读取
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map((entry, i) =>
      buildParsedItem(entry, ids[i] ?? "", platform),
    );
  }

  // 无法识别的结构（字符串、数字等）
  return ids.map((id) => ({
    id,
    ok: false,
    platform,
    message: "unrecognized response",
  }));
}

/**
 * 调用上游解析接口
 */
async function callParse(
  platform: string,
  idsString: string,
  quality: string,
): Promise<{ code: number; data?: unknown; message?: string }> {
  return callUpstream("/v1/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, ids: idsString, quality }),
  });
}

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

    // 缓存检查：按请求 quality 缓存，而非降级后的 quality
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

    // 获取降级链
    const chain = QUALITY_FALLBACK_CHAIN[quality];

    // 首次批量请求（使用首选 quality）
    let items: ParsedItem[];
    try {
      const upstream = await callParse(platformLower, idsString, chain[0]);
      items = extractItemsFromUpstream(upstream.data, ids, platformLower);
      // 为成功的项标记实际音质
      for (const item of items) {
        if (item.ok) {
          item.quality = chain[0];
        }
      }
    } catch {
      // 首次批量请求整体失败，为每个 id 初始化失败项
      items = ids.map((id) => ({
        id,
        ok: false,
        platform: platformLower,
        message: "no playable url",
      }));
    }

    // 对失败的 id 执行逐个降级重试
    for (let i = 0; i < items.length; i++) {
      if (items[i].ok) continue;

      const failedId = items[i].id;
      const qualitiesTried: string[] = [chain[0]];
      let resolved = false;

      // 从第二档开始尝试（第一档已在批量请求中尝试）
      for (let q = 1; q < chain.length; q++) {
        qualitiesTried.push(chain[q]);
        try {
          const retryUpstream = await callParse(platformLower, failedId, chain[q]);
          const retryItems = extractItemsFromUpstream(
            retryUpstream.data,
            [failedId],
            platformLower,
          );
          const retryItem = retryItems[0];
          if (retryItem && retryItem.ok && retryItem.url) {
            retryItem.quality = chain[q];
            items[i] = retryItem;
            resolved = true;
            break;
          }
        } catch {
          // 当前档位失败，继续下一档
        }
      }

      // 如果所有降级都失败，记录尝试过的音质，保留原始错误消息
      if (!resolved) {
        items[i] = {
          id: failedId,
          ok: false,
          platform: platformLower,
          message: items[i].message ?? "no playable url",
          qualitiesTried,
        };
      }
    }

    const response = {
      code: 0,
      message: "ok",
      data: { items },
    };

    // 写入缓存
    cacheSet(cacheKey, response);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
