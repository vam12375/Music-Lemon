<template>
  <div class="track-list">
    <div
      v-for="(track, index) in tracks"
      :key="track.id"
      :class="['track-item', { 'track-item--active': track.id === playingId }]"
    >
      <span class="track-item__index">{{ index + 1 }}</span>
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
      <span class="track-item__duration">{{ formatDuration(track.duration) }}</span>
      <button class="track-item__play" @click="$emit('play', track, index)">
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
  border-radius: 8px;
  transition: background .15s;
}
.track-item:hover { background: #F3F4F6; }
.track-item--active { background: #EFF6FF; }
.track-item__index {
  width: 28px;
  text-align: center;
  font-size: 13px;
  color: #9CA3AF;
  flex-shrink: 0;
}
.track-item__cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: #F3F4F6;
}
.track-item__cover--placeholder {
  background: #E5E7EB;
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
}
.track-item__artist {
  font-size: 12px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-item__duration {
  font-size: 13px;
  color: #9CA3AF;
  flex-shrink: 0;
}
.track-item__play {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #2563EB;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s;
  flex-shrink: 0;
}
.track-item:hover .track-item__play { opacity: 1; }
.track-item__play:hover { background: #1D4ED8; }
</style>
