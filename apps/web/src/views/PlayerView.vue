<template>
  <div class="player-view">
    <!-- 曲目信息 -->
    <div class="player-view__header">
      <img
        v-if="store.currentTrack?.cover"
        :src="store.currentTrack.cover"
        class="player-view__cover"
      />
      <div v-else class="player-view__cover player-view__cover--placeholder" />
      <div class="player-view__meta">
        <h2>{{ store.currentTrack?.title || "未知曲目" }}</h2>
        <p class="player-view__artist">{{ store.currentTrack?.artist || "" }}</p>
        <p class="player-view__quality" v-if="store.playUrl">
          <select
            class="player-view__quality-select"
            :value="store.quality"
            @change="onQuality"
          >
            <option value="128k">128k</option>
            <option value="320k">320k</option>
            <option value="flac">FLAC</option>
            <option value="flac24bit">Hi-Res</option>
          </select>
        </p>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="store.playState === 'loading'" class="player-view__status">解析中...</div>
    <div v-else-if="store.playState === 'error'" class="player-view__status player-view__status--error">
      <p>{{ store.errorMessage || "播放出错" }}</p>
      <button class="player-view__retry" @click="retry">重试解析</button>
      <router-link to="/" class="player-view__back">返回列表</router-link>
    </div>

    <!-- 播放控制 -->
    <div v-if="store.playUrl" class="player-view__controls">
      <button class="player-view__btn" @click="store.prev" :disabled="!store.hasPrev">⏮</button>
      <button class="player-view__btn player-view__btn--main" @click="store.togglePlay">
        {{ store.playState === "playing" ? "⏸" : "▶" }}
      </button>
      <button class="player-view__btn" @click="store.next" :disabled="!store.hasNext">⏭</button>
    </div>

    <!-- 进度条 -->
    <div v-if="store.playUrl" class="player-view__progress">
      <span>{{ formatTime(store.progress) }}</span>
      <input
        type="range"
        class="player-view__slider"
        min="0"
        :max="store.duration || 0"
        :value="store.progress"
        step="0.1"
        @input="onSeek"
      />
      <span>{{ formatTime(store.duration) }}</span>
    </div>

    <!-- 歌词面板 -->
    <div class="player-view__lyrics" ref="lyricsContainer">
      <template v-if="store.lyrics.length > 0">
        <p
          v-for="(line, i) in store.lyrics"
          :key="i"
          :ref="(el) => { if (el) lyricRefs[i] = el as HTMLElement }"
          :class="['lyric-line', { 'lyric-line--active': i === activeLyricIndex }]"
          @click="store.seek(line.time)"
        >
          {{ line.text }}
        </p>
      </template>
      <p v-else-if="store.rawLyricText" class="player-view__raw-lyric">
        {{ store.rawLyricText }}
      </p>
      <p v-else class="player-view__no-lyric">暂无歌词</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import type { Platform, Quality } from "@/types";
import { usePlayerStore } from "@/stores/player";

const route = useRoute();
const store = usePlayerStore();
const lyricsContainer = ref<HTMLElement | null>(null);
const lyricRefs = ref<HTMLElement[]>([]);

// 当前激活的歌词行索引
const activeLyricIndex = computed(() => {
  if (store.lyrics.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < store.lyrics.length; i++) {
    if (store.lyrics[i].time <= store.progress) idx = i;
    else break;
  }
  return idx;
});

// 歌词自动滚动
watch(activeLyricIndex, (idx) => {
  if (idx >= 0 && lyricRefs.value[idx] && lyricsContainer.value) {
    nextTick(() => {
      lyricRefs.value[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
});

// 直达播放页时，若 store 中无当前曲目，创建一个占位并触发解析
onMounted(() => {
  const platform = route.params.platform as Platform;
  const sourceId = route.params.sourceId as string;
  const trackId = `${platform}:${sourceId}`;

  if (!store.currentTrack || store.currentTrack.id !== trackId) {
    store.playTrack({
      id: trackId,
      title: "",
      artist: "",
      cover: "",
      duration: 0,
      platform,
      sourceId,
    });
  }
});

function retry() {
  if (store.currentTrack) {
    store.playTrack(store.currentTrack);
  }
}

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function onSeek(e: Event) {
  store.seek(Number((e.target as HTMLInputElement).value));
}

function onQuality(e: Event) {
  store.setQuality((e.target as HTMLSelectElement).value as Quality);
}
</script>

<style scoped>
.player-view {
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: 100px;
}
.player-view__header {
  display: flex;
  gap: 24px;
  align-items: center;
  margin-bottom: 32px;
}
.player-view__cover {
  width: 160px;
  height: 160px;
  border-radius: 12px;
  object-fit: cover;
}
.player-view__cover--placeholder {
  background: #E5E7EB;
}
.player-view__meta h2 {
  font-size: 22px;
  font-weight: 600;
}
.player-view__artist {
  font-size: 15px;
  color: #6B7280;
  margin-top: 4px;
}
.player-view__quality {
  margin-top: 8px;
}
.player-view__quality-select {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  outline: none;
}
.player-view__quality-select:focus { border-color: #2563EB; }
.player-view__status {
  text-align: center;
  padding: 24px;
  color: #6B7280;
}
.player-view__status--error { color: #DC2626; }
.player-view__retry,
.player-view__back {
  display: inline-block;
  margin: 8px 8px 0;
  padding: 8px 20px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  color: inherit;
}
.player-view__controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.player-view__btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: #F3F4F6;
  cursor: pointer;
  font-size: 18px;
}
.player-view__btn:disabled { opacity: .3; }
.player-view__btn--main {
  width: 56px;
  height: 56px;
  background: #2563EB;
  color: #fff;
  font-size: 22px;
}
.player-view__progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  font-size: 13px;
  color: #9CA3AF;
}
.player-view__slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E7EB;
  border-radius: 2px;
  outline: none;
}
.player-view__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2563EB;
}
.player-view__lyrics {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px 0;
}
.lyric-line {
  padding: 8px 0;
  font-size: 15px;
  color: #9CA3AF;
  text-align: center;
  cursor: pointer;
  transition: color .2s, font-size .2s;
}
.lyric-line--active {
  color: #2563EB;
  font-size: 17px;
  font-weight: 600;
}
.player-view__raw-lyric {
  white-space: pre-wrap;
  font-size: 14px;
  color: #6B7280;
  text-align: center;
  line-height: 2;
}
.player-view__no-lyric {
  text-align: center;
  color: #9CA3AF;
  padding: 32px;
}

@media (max-width: 768px) {
  .player-view__header { gap: 16px; }
  .player-view__cover { width: 100px; height: 100px; }
  .player-view__meta h2 { font-size: 18px; }
}
</style>
