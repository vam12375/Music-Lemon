import { Router } from "express";
import { buildCacheKey, cacheGet, cacheSet } from "../cache";
import { AppError } from "../errors";
import { config } from "../config";

export const detailRouter = Router();

/** 允许的平台 */
const ALLOWED_PLATFORMS = new Set(["netease", "qq", "kuwo"]);

/**
 * 直接从平台公开 API 获取歌曲详情（不消耗 API Key）
 * GET /api/detail/:platform/:id
 */
detailRouter.get("/:platform/:id", async (req, res, next) => {
  try {
    const { platform, id } = req.params;

    const platformLower = platform.toLowerCase();
    if (!ALLOWED_PLATFORMS.has(platformLower)) {
      throw new AppError(400, 400, `不支持的平台: ${platform}`);
    }

    if (!id || !/^\d+$/.test(id)) {
      throw new AppError(400, 400, "无效的歌曲 ID");
    }

    // 缓存检查
    const cacheKey = buildCacheKey({ route: "detail", platform: platformLower, id });
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      res.json(cached);
      return;
    }

    let detail: { title: string; artist: string; cover: string; album: string; duration: number };

    switch (platformLower) {
      case "netease":
        detail = await fetchNeteaseDetail(id);
        break;
      default:
        // 其他平台暂不支持免费详情，返回空数据
        throw new AppError(404, 404, `平台 ${platformLower} 暂不支持免费详情获取`);
    }

    const response = {
      code: 0,
      message: "ok",
      data: { ...detail, id, platform: platformLower },
    };

    cacheSet(cacheKey, response);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * 从网易云公开 API 获取歌曲详情
 */
async function fetchNeteaseDetail(id: string): Promise<{
  title: string;
  artist: string;
  cover: string;
  album: string;
  duration: number;
}> {
  const url = `https://music.163.com/api/song/detail?id=${id}&ids=[${id}]`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://music.163.com/",
    },
    signal: AbortSignal.timeout(config.upstreamTimeout),
  });

  if (!res.ok) {
    throw new AppError(502, 502, `网易云 API 请求失败: ${res.status}`);
  }

  const body = await res.json() as {
    code?: number;
    songs?: {
      name: string;
      id: number;
      artists?: { name: string }[];
      album?: { name: string; picUrl?: string; blurPicUrl?: string };
      duration?: number;
    }[];
  };

  if (body.code !== 200 || !body.songs?.length) {
    throw new AppError(404, 404, "未找到歌曲信息");
  }

  const song = body.songs[0];
  return {
    title: song.name ?? "",
    artist: song.artists?.map(a => a.name).join(" / ") ?? "",
    cover: song.album?.picUrl ?? song.album?.blurPicUrl ?? "",
    album: song.album?.name ?? "",
    duration: typeof song.duration === "number" ? song.duration / 1000 : 0,
  };
}
