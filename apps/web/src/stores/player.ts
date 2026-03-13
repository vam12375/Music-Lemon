import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { Track, LyricLine, PlayState, Quality } from "@/types";
import { parse } from "@/api/client";
import { useRecentTracks } from "@/composables/useRecentTracks";

// 全局 Audio 实例
let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
}

/** 上游单曲解析结果 */
export interface ParseResultItem {
  id: string;
  success: boolean;
  url?: string;
  info?: { name: string; artist: string; album: string; duration: number };
  cover?: string;
  lyrics?: string;
  actualQuality?: string;
  requestedQuality?: string;
  qualityMatch?: boolean;
  wasDowngraded?: boolean;
  fileSize?: number;
  responseTime?: number;
  expire?: number;
  fromCache?: boolean;
}

/** 上游解析响应汇总 */
export interface ParseResponse {
  data: ParseResultItem[];
  total: number;
  success_count: number;
  fail_count: number;
  cache_hit_count: number;
  cost: number;
}

/**
 * 解析 LRC 歌词文本为结构化歌词行
 */
function parseLrc(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
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
  return lines;
}

export const usePlayerStore = defineStore("player", () => {
  // 状态
  const currentTrack = ref<Track | null>(null);
  const queue = ref<Track[]>([]);
  const playState = ref<PlayState>("idle");
  const progress = ref(0);
  const duration = ref(0);
  const volume = ref(0.8);
  const lyrics = ref<LyricLine[]>([]);
  const rawLyricText = ref<string | null>(null);
  const quality = ref<Quality>("flac24bit");
  const playUrl = ref<string | null>(null);
  const errorMessage = ref("");
  /** 最近一次解析的完整响应（用于 PlayerView 展示） */
  const parseResult = ref<ParseResponse | null>(null);

  // 计算属性
  const queueIndex = computed(() => {
    if (!currentTrack.value) return -1;
    return queue.value.findIndex(t => t.id === currentTrack.value!.id);
  });
  const hasNext = computed(() => queueIndex.value < queue.value.length - 1);
  const hasPrev = computed(() => queueIndex.value > 0);

  // 绑定 Audio 事件
  function bindAudioEvents() {
    const a = getAudio();
    a.oncanplay = () => {
      if (playState.value === "loading" || playState.value === "buffering") {
        playState.value = "playing";
        a.play();
      }
    };
    a.onplay = () => { playState.value = "playing"; };
    a.onpause = () => {
      if (playState.value !== "loading") playState.value = "paused";
    };
    a.onwaiting = () => { playState.value = "buffering"; };
    a.ontimeupdate = () => {
      progress.value = a.currentTime;
      duration.value = a.duration || 0;
    };
    a.onended = () => {
      if (hasNext.value) {
        next();
      } else {
        playState.value = "idle";
      }
    };
    a.onerror = () => {
      playState.value = "error";
      errorMessage.value = "播放出错";
    };
    a.volume = volume.value;
  }

  // 解析并播放曲目（内部方法）
  async function loadAndPlay(track: Track) {
    playState.value = "loading";
    errorMessage.value = "";
    lyrics.value = [];
    rawLyricText.value = null;
    playUrl.value = null;
    parseResult.value = null;

    // 记录到最近播放（所有播放路径的公共入口）
    const { addRecent } = useRecentTracks();
    addRecent(track);

    try {
      // 上游新格式：data.data[] 而非 data.items[]
      const data = await parse(track.platform, track.sourceId, quality.value) as ParseResponse;
      parseResult.value = data;

      const item = data.data?.[0];
      if (!item || !item.success || !item.url) {
        playState.value = "error";
        errorMessage.value = "无法获取播放链接";
        return;
      }

      playUrl.value = item.url;

      // 用解析结果更新曲目元数据（封面、标题、歌手等）
      if (item.info && currentTrack.value) {
        if (item.info.name) currentTrack.value.title = item.info.name;
        if (item.info.artist) currentTrack.value.artist = item.info.artist;
        if (item.info.duration) currentTrack.value.duration = item.info.duration;
      }
      if (item.cover && currentTrack.value) {
        currentTrack.value.cover = item.cover;
      }

      // 解析歌词（上游返回原始 LRC 文本）
      if (item.lyrics) {
        const parsed = parseLrc(item.lyrics);
        if (parsed.length > 0) {
          lyrics.value = parsed;
        } else {
          rawLyricText.value = item.lyrics;
        }
      }

      // 播放
      const a = getAudio();
      bindAudioEvents();
      a.src = item.url;
      a.load();
    } catch (e) {
      playState.value = "error";
      errorMessage.value = e instanceof Error ? e.message : "解析失败";
    }
  }

  // 监听音量变化
  watch(volume, (v) => {
    const a = getAudio();
    a.volume = v;
  });

  /** 仅查看曲目（不触发解析，用于进入详情页） */
  function viewTrack(track: Track, newQueue?: Track[]) {
    if (newQueue) queue.value = newQueue;
    // 如果切换了曲目，重置播放状态
    if (!currentTrack.value || currentTrack.value.id !== track.id) {
      playState.value = "idle";
      playUrl.value = null;
      lyrics.value = [];
      rawLyricText.value = null;
      errorMessage.value = "";
      progress.value = 0;
      duration.value = 0;
      parseResult.value = null;
      // 停止当前播放
      const a = getAudio();
      a.pause();
      a.removeAttribute("src");
    }
    currentTrack.value = track;
  }

  /** 手动解析当前曲目（用户点击"解析"按钮时调用） */
  async function manualParse() {
    if (!currentTrack.value) return;
    await loadAndPlay(currentTrack.value);
  }

  /** 播放指定曲目（自动解析，用于列表播放按钮、上下曲切换） */
  function playTrack(track: Track, newQueue?: Track[]) {
    if (newQueue) queue.value = newQueue;
    currentTrack.value = track;
    loadAndPlay(track);
  }

  /** 播放/暂停切换 */
  function togglePlay() {
    const a = getAudio();
    if (playState.value === "playing") {
      a.pause();
    } else if (playState.value === "paused") {
      a.play();
    }
  }

  /** 跳转进度 */
  function seek(time: number) {
    const a = getAudio();
    a.currentTime = time;
    progress.value = time;
  }

  /** 下一首 */
  function next() {
    if (!hasNext.value) {
      playState.value = "idle";
      return;
    }
    const nextTrack = queue.value[queueIndex.value + 1];
    currentTrack.value = nextTrack;
    loadAndPlay(nextTrack);
  }

  /** 上一首 */
  function prev() {
    if (!hasPrev.value) {
      seek(0);
      return;
    }
    const prevTrack = queue.value[queueIndex.value - 1];
    currentTrack.value = prevTrack;
    loadAndPlay(prevTrack);
  }

  /** 切换音质并重新解析当前曲目 */
  function setQuality(q: Quality) {
    if (q === quality.value) return;
    quality.value = q;
    if (currentTrack.value && playUrl.value) {
      loadAndPlay(currentTrack.value);
    }
  }

  return {
    currentTrack, queue, playState, progress, duration,
    volume, lyrics, rawLyricText, quality, playUrl, errorMessage,
    parseResult,
    queueIndex, hasNext, hasPrev,
    viewTrack, manualParse, playTrack, togglePlay, seek, next, prev, setQuality,
  };
});
