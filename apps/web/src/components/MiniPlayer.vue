<template>
  <div v-if="store.currentTrack" class="mini-player" :style="{ '--mini-progress': progressPercent }">
    <div class="mini-player__inner">
      <!-- 曲目信息 -->
      <router-link
        :to="`/player/${store.currentTrack.platform}/${store.currentTrack.sourceId}`"
        class="mini-player__info"
      >
        <img
          v-if="store.currentTrack.cover"
          :src="store.currentTrack.cover"
          class="mini-player__cover"
        />
        <div class="mini-player__text">
          <p class="mini-player__title">{{ store.currentTrack.title }}</p>
          <p class="mini-player__artist">{{ store.currentTrack.artist }}</p>
        </div>
      </router-link>

      <!-- 播放控制 -->
      <div class="mini-player__controls">
        <button class="mini-player__btn" @click="store.prev" :disabled="!store.hasPrev">⏮</button>
        <button class="mini-player__btn mini-player__btn--main" @click="store.togglePlay">
          {{ playIcon }}
        </button>
        <button class="mini-player__btn" @click="store.next" :disabled="!store.hasNext">⏭</button>
      </div>

      <!-- 进度条 -->
      <div class="mini-player__progress">
        <span class="mini-player__time">{{ formatTime(store.progress) }}</span>
        <input
          type="range"
          class="mini-player__slider"
          min="0"
          :max="store.duration || 0"
          :value="store.progress"
          step="0.1"
          @input="onSeek"
        />
        <span class="mini-player__time">{{ formatTime(store.duration) }}</span>
      </div>

      <!-- 音量 -->
      <div class="mini-player__volume">
        <input
          type="range"
          class="mini-player__vol-slider"
          min="0"
          max="1"
          step="0.01"
          :value="store.volume"
          @input="onVolume"
        />
      </div>

      <!-- 音质选择 -->
      <select
        class="mini-player__quality"
        :value="store.quality"
        @change="onQuality"
      >
        <option value="128k">128k</option>
        <option value="320k">320k</option>
        <option value="flac">FLAC</option>
        <option value="flac24bit">Hi-Res</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePlayerStore } from "@/stores/player";
import type { Quality } from "@/types";

const store = usePlayerStore();

const playIcon = computed(() => {
  switch (store.playState) {
    case "playing": return "⏸";
    case "loading":
    case "buffering": return "⏳";
    default: return "▶";
  }
});

const progressPercent = computed(() => {
  if (!store.duration || store.duration === 0) return '0%';
  return `${(store.progress / store.duration) * 100}%`;
});

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function onSeek(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  store.seek(val);
}

function onVolume(e: Event) {
  store.volume = Number((e.target as HTMLInputElement).value);
}

function onQuality(e: Event) {
  store.setQuality((e.target as HTMLSelectElement).value as Quality);
}
</script>

<style scoped>
.mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--border-subtle);
  z-index: 200;
}
.mini-player::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--gradient-accent);
  width: var(--mini-progress, 0%);
  transition: width 0.3s linear;
}
.mini-player__inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.mini-player__info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
  text-decoration: none;
  color: inherit;
}
.mini-player__cover {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}
.mini-player__text { min-width: 0; }
.mini-player__title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}
.mini-player__artist {
  font-size: 12px;
  color: var(--text-secondary);
}
.mini-player__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-player__btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: color .15s;
}
.mini-player__btn:hover { color: var(--text-primary); }
.mini-player__btn:disabled { opacity: .3; cursor: not-allowed; }
.mini-player__btn--main {
  width: 40px;
  height: 40px;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 16px;
  transition: transform .15s, box-shadow .15s;
}
.mini-player__btn--main:hover {
  transform: scale(1.08);
  box-shadow: var(--shadow-glow);
}
.mini-player__progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-player__time {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}
.mini-player__slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.mini-player__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}
.mini-player__volume { width: 80px; }
.mini-player__vol-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.mini-player__vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-secondary);
}
.mini-player__quality {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-card);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  outline: none;
}
.mini-player__quality:focus { border-color: var(--accent); }
.mini-player__quality option { background: var(--bg-card); color: var(--text-primary); }

@media (max-width: 768px) {
  .mini-player__inner { padding: 0 12px; gap: 12px; }
  .mini-player__info { min-width: 120px; }
  .mini-player__volume { display: none; }
  .mini-player__quality { display: none; }
  .mini-player__time { display: none; }
}
</style>
