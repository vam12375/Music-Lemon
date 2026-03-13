<template>
  <div class="track-list">
    <div
      v-for="(track, index) in tracks"
      :key="track.id"
      :class="['track-item', { 'track-item--active': track.id === playingId }]"
    >
      <span class="track-item__index">{{ index + 1 }}</span>
      <!-- 点击行跳转详情页（仅查看，不解析） -->
      <router-link
        :to="`/player/${track.platform}/${track.sourceId}`"
        class="track-item__link"
        @click="$emit('view', track, index)"
      >
        <img
          v-if="track.cover"
          :src="track.cover"
          class="track-item__cover"
          loading="lazy"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        />
        <div v-else class="track-item__cover track-item__cover--placeholder" />
        <div class="track-item__info">
          <p class="track-item__title">{{ track.title }}</p>
          <p class="track-item__artist">{{ track.artist }}</p>
        </div>
      </router-link>
      <span class="track-item__duration">{{ formatDuration(track.duration) }}</span>
      <button class="track-item__play" @click.stop="$emit('play', track, index)">
        ▶
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Track } from "@/types";

defineProps<{
  tracks: Track[];
  playingId?: string;
}>();

defineEmits<{
  view: [track: Track, index: number];
  play: [track: Track, index: number];
}>();

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

<style scoped>
.track-list {
  display: flex;
  flex-direction: column;
}
.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background .15s;
  position: relative;
}
.track-item:hover { background: var(--bg-hover); }
.track-item--active {
  background: var(--accent-glow);
}
.track-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--gradient-accent);
  border-radius: 1px;
}
.track-item__index {
  width: 28px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.track-item--active .track-item__index {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: transparent;
  position: relative;
}
.track-item--active .track-item__index::before,
.track-item--active .track-item__index::after {
  content: '';
  display: block;
  width: 3px;
  background: var(--accent);
  border-radius: 1px;
  animation: eq-bar 0.8s ease-in-out infinite alternate;
}
.track-item--active .track-item__index::before {
  height: 12px;
  animation-delay: 0s;
}
.track-item--active .track-item__index::after {
  height: 8px;
  animation-delay: 0.3s;
}
@keyframes eq-bar {
  0% { transform: scaleY(0.3); }
  100% { transform: scaleY(1); }
}

.track-item__link {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}
.track-item__cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-elevated);
}
.track-item__cover--placeholder {
  background: var(--bg-hover);
}
.track-item__info {
  flex: 1;
  min-width: 0;
}
.track-item__title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}
.track-item--active .track-item__title { color: var(--accent); }
.track-item__artist {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-item__duration {
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.track-item__play {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  flex-shrink: 0;
}
.track-item:hover .track-item__play { opacity: 1; }
.track-item__play:hover { transform: scale(1.1); box-shadow: var(--shadow-glow); }

@media (max-width: 768px) {
  .track-item__index { display: none; }
  .track-item__duration { display: none; }
  .track-item__play { opacity: 1; }
  .track-item { gap: 10px; padding: 8px 8px; }
}
</style>
