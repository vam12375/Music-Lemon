/** 平台枚举 */
export type Platform = "netease" | "qq" | "kuwo";

/** 音质枚举 */
export type Quality = "128k" | "320k" | "flac" | "flac24bit";

/** 播放状态 */
export type PlayState = "idle" | "loading" | "playing" | "paused" | "buffering" | "error";

/** 榜单 */
export interface Chart {
  id: string;
  name: string;
  cover: string;
  platform: Platform;
}

/** 歌单 */
export interface Playlist {
  id: string;
  name: string;
  cover: string;
  description: string;
  platform: Platform;
  tracks: Track[];
}

/** 曲目 */
export interface Track {
  id: string;        // ${platform}:${sourceId}
  title: string;
  artist: string;
  cover: string;
  duration: number;   // 秒
  platform: Platform;
  sourceId: string;   // 平台原始 ID
}

/** 歌词行 */
export interface LyricLine {
  time: number;  // 秒
  text: string;
}

/** 解析结果项 */
export interface ParseItem {
  id: string;
  ok: boolean;
  url?: string;
  lyric?: string;
  platform: Platform;
  quality?: Quality;
  message?: string;
  qualitiesTried?: Quality[];
}
