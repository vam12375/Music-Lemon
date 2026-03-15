import type { Chart, Track, Playlist, Platform } from "@/types";
import { neteasePicUrl } from "@/utils/netease-pic";

/**
 * 从 exec 原始响应中提取 raw 数据
 */
export function extractRaw(execData: { raw: unknown; contentType: string }): unknown {
  if (typeof execData.contentType === "string" && !execData.contentType.includes("application/json")) {
    throw new Error("暂不支持解析非 JSON 响应");
  }
  return execData.raw;
}

// ============ 榜单列表 (toplists) ============

function parseNeteaseCharts(raw: unknown): Chart[] {
  const data = raw as { list?: { id: number; name: string; coverImgUrl?: string }[] };
  return (data.list ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
    cover: item.coverImgUrl ?? "",
    platform: "netease" as Platform,
  }));
}

function parseQQCharts(raw: unknown): Chart[] {
  const data = raw as { data?: { topList?: { id: number; name: string; picUrl?: string }[] } };
  return (data.data?.topList ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
    cover: item.picUrl ?? "",
    platform: "qq" as Platform,
  }));
}

function parseKuwoCharts(raw: unknown): Chart[] {
  const data = raw as { data?: { id: string; name: string; pic?: string }[] };
  return (data.data ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
    cover: item.pic ?? "",
    platform: "kuwo" as Platform,
  }));
}

export function adaptCharts(raw: unknown, platform: Platform): Chart[] {
  switch (platform) {
    case "netease": return parseNeteaseCharts(raw);
    case "qq": return parseQQCharts(raw);
    case "kuwo": return parseKuwoCharts(raw);
  }
}

// ============ 搜索 (search) → Track[] ============

function neteaseTrack(item: Record<string, unknown>, platform: Platform): Track {
  // 兼容新版 (ar/al/dt) 和旧版 (artists/album/duration) 两种响应结构
  const ar = (item.ar ?? item.artists) as { name: string }[] | undefined;
  const al = (item.al ?? item.album) as { picUrl?: string; picId?: number } | undefined;
  const sourceId = String(item.id ?? item.songId ?? "");
  const rawDur = item.dt ?? item.duration;
  // 优先使用 picUrl；搜索接口仅返回 picId 时，通过 CDN 加密生成图片 URL
  const cover = al?.picUrl || (al?.picId ? neteasePicUrl(al.picId) : "");
  return {
    id: `${platform}:${sourceId}`,
    title: String(item.name ?? ""),
    artist: ar?.[0]?.name ?? "",
    cover,
    duration: typeof rawDur === "number" ? rawDur / 1000 : 0,
    platform,
    sourceId,
  };
}

function qqTrack(item: Record<string, unknown>, platform: Platform): Track {
  const singer = item.singer as { name: string }[] | undefined;
  const sourceId = String(item.songmid ?? item.id ?? "");
  const albummid = item.albummid as string | undefined;
  const cover = albummid
    ? `https://y.qq.com/music/photo_new/T002R300x300M000${albummid}.jpg`
    : "";
  return {
    id: `${platform}:${sourceId}`,
    title: String(item.songname ?? item.songName ?? item.name ?? ""),
    artist: singer?.[0]?.name ?? "",
    cover,
    duration: typeof item.interval === "number" ? item.interval : 0,
    platform,
    sourceId,
  };
}

function kuwoTrack(item: Record<string, unknown>, platform: Platform): Track {
  const sourceId = String(item.rid ?? item.RID ?? item.id ?? "");
  const dur = item.duration ?? item.DURATION;
  return {
    id: `${platform}:${sourceId}`,
    title: String(item.name ?? item.SONGNAME ?? item.songName ?? ""),
    artist: String(item.artist ?? item.ARTIST ?? ""),
    cover: String(item.pic ?? item.web_albumpic_short ?? ""),
    duration: typeof dur === "number" ? dur : Number(dur) || 0,
    platform,
    sourceId,
  };
}

function adaptTrack(item: Record<string, unknown>, platform: Platform): Track {
  switch (platform) {
    case "netease": return neteaseTrack(item, platform);
    case "qq": return qqTrack(item, platform);
    case "kuwo": return kuwoTrack(item, platform);
  }
}

// ============ search → Track[] ============

export function adaptSearchTracks(raw: unknown, platform: Platform): Track[] {
  switch (platform) {
    case "netease": {
      const data = raw as { result?: { songs?: Record<string, unknown>[] } };
      return (data.result?.songs ?? []).map((t) => adaptTrack(t, platform));
    }
    case "qq": {
      const data = raw as { data?: { song?: { list?: Record<string, unknown>[] } } };
      return (data.data?.song?.list ?? []).map((t) => adaptTrack(t, platform));
    }
    case "kuwo": {
      const data = raw as { abslist?: Record<string, unknown>[] };
      return (data.abslist ?? []).map((t) => adaptTrack(t, platform));
    }
  }
}

// ============ toplist / playlist → Playlist ============

function parseNeteasePlaylist(raw: unknown, platform: Platform): Playlist {
  const data = raw as {
    code?: number;
    message?: string;
    msg?: string;
    result?: {
      id: number; name: string; coverImgUrl?: string; description?: string;
      tracks?: Record<string, unknown>[];
    };
    playlist?: {
      id: number; name: string; coverImgUrl?: string; description?: string;
      tracks?: Record<string, unknown>[];
    };
  };
  // 检测平台错误码
  if (data.code !== undefined && data.code !== 200 && data.code !== 0) {
    throw new Error(data.message ?? data.msg ?? `网易云返回错误 (code: ${data.code})`);
  }
  // 兼容 result / playlist 两种响应结构
  const pl = data.result ?? data.playlist;
  if (!pl) throw new Error("无法解析网易云歌单数据");
  const cover = pl.coverImgUrl ?? "";
  return {
    id: String(pl.id),
    name: pl.name,
    cover,
    description: pl.description ?? "",
    platform,
    tracks: (pl.tracks ?? []).map((t) => {
      const track = adaptTrack(t, platform);
      if (!track.cover) track.cover = cover;
      return track;
    }),
  };
}

function parseQQPlaylist(raw: unknown, platform: Platform): Playlist {
  const data = raw as {
    data?: {
      topinfo?: { ListName?: string; pic_album?: string; info?: string };
      songlist?: Record<string, unknown>[];
    };
  };
  const info = data.data?.topinfo;
  const cover = info?.pic_album ?? "";
  return {
    id: "",
    name: info?.ListName ?? "",
    cover,
    description: info?.info ?? "",
    platform,
    tracks: (data.data?.songlist ?? []).map((t) => {
      const track = adaptTrack(t, platform);
      if (!track.cover) track.cover = cover;
      return track;
    }),
  };
}

function parseKuwoPlaylist(raw: unknown, platform: Platform): Playlist {
  const data = raw as {
    name?: string; pic?: string; musicList?: Record<string, unknown>[];
  };
  const cover = data.pic ?? "";
  return {
    id: "",
    name: data.name ?? "",
    cover,
    description: "",
    platform,
    tracks: (data.musicList ?? []).map((t) => {
      const track = adaptTrack(t, platform);
      if (!track.cover) track.cover = cover;
      return track;
    }),
  };
}

export function adaptPlaylist(raw: unknown, platform: Platform): Playlist {
  switch (platform) {
    case "netease": return parseNeteasePlaylist(raw, platform);
    case "qq": return parseQQPlaylist(raw, platform);
    case "kuwo": return parseKuwoPlaylist(raw, platform);
  }
}
