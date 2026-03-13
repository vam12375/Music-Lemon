import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Track, LyricLine, PlayState, Quality } from "@/types";

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

  // 计算属性
  const queueIndex = computed(() => {
    if (!currentTrack.value) return -1;
    return queue.value.findIndex(t => t.id === currentTrack.value!.id);
  });
  const hasNext = computed(() => queueIndex.value < queue.value.length - 1);
  const hasPrev = computed(() => queueIndex.value > 0);

  /** 播放指定曲目，可选传入新队列 */
  function playTrack(track: Track, newQueue?: Track[]) {
    if (newQueue) queue.value = newQueue;
    currentTrack.value = track;
    playState.value = "loading";
  }

  /** 播放下一首 */
  function next() {
    if (!hasNext.value) {
      playState.value = "idle";
      return;
    }
    const nextTrack = queue.value[queueIndex.value + 1];
    currentTrack.value = nextTrack;
    playState.value = "loading";
  }

  /** 播放上一首 */
  function prev() {
    if (!hasPrev.value) {
      progress.value = 0;
      return;
    }
    const prevTrack = queue.value[queueIndex.value - 1];
    currentTrack.value = prevTrack;
    playState.value = "loading";
  }

  /** 设置播放状态 */
  function setPlayState(state: PlayState) {
    playState.value = state;
  }

  return {
    currentTrack, queue, playState, progress, duration,
    volume, lyrics, rawLyricText, quality, playUrl,
    queueIndex, hasNext, hasPrev,
    playTrack, next, prev, setPlayState,
  };
});
