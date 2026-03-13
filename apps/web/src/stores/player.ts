import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { Track, LyricLine, PlayState, Quality } from "@/types";
import { parse } from "@/api/client";

// 全局 Audio 实例
let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
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

  // 解析并播放曲目
  async function loadAndPlay(track: Track) {
    playState.value = "loading";
    errorMessage.value = "";
    lyrics.value = [];
    rawLyricText.value = null;
    playUrl.value = null;

    try {
      const data = await parse(track.platform, track.sourceId, quality.value) as {
        items: { id: string; ok: boolean; url?: string; lyric?: string; rawLyricText?: string; quality?: string }[];
      };
      const item = data.items?.[0];
      if (!item || !item.ok || !item.url) {
        playState.value = "error";
        errorMessage.value = item?.message ?? "无法获取播放链接";
        return;
      }

      playUrl.value = item.url;

      // 解析歌词
      if (item.lyric) {
        try {
          const parsed = JSON.parse(item.lyric) as LyricLine[];
          lyrics.value = parsed;
        } catch {
          lyrics.value = [];
          rawLyricText.value = item.lyric;
        }
      }
      if (item.rawLyricText) {
        rawLyricText.value = item.rawLyricText;
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

  // 监听 currentTrack 变化自动解析播放
  watch(currentTrack, (track) => {
    if (track) loadAndPlay(track);
  });

  // 监听音量变化
  watch(volume, (v) => {
    const a = getAudio();
    a.volume = v;
  });

  /** 播放指定曲目，可选传入新队列 */
  function playTrack(track: Track, newQueue?: Track[]) {
    if (newQueue) queue.value = newQueue;
    currentTrack.value = track;
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
    currentTrack.value = queue.value[queueIndex.value + 1];
  }

  /** 上一首 */
  function prev() {
    if (!hasPrev.value) {
      seek(0);
      return;
    }
    currentTrack.value = queue.value[queueIndex.value - 1];
  }

  /** 切换音质并重新解析当前曲目 */
  function setQuality(q: Quality) {
    if (q === quality.value) return;
    quality.value = q;
    if (currentTrack.value) {
      loadAndPlay(currentTrack.value);
    }
  }

  return {
    currentTrack, queue, playState, progress, duration,
    volume, lyrics, rawLyricText, quality, playUrl, errorMessage,
    queueIndex, hasNext, hasPrev,
    playTrack, togglePlay, seek, next, prev, setQuality,
  };
});
