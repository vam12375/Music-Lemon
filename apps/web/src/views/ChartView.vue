<template>
  <div class="chart-view">
    <!-- 加载 -->
    <div v-if="loading" class="chart-view__loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="chart-view__error">
      <p>{{ error }}</p>
      <button class="chart-view__retry" @click="fetchPlaylist">重试</button>
    </div>

    <!-- 内容 -->
    <template v-else-if="playlist">
      <div class="chart-view__header">
        <img v-if="playlist.cover" :src="playlist.cover" class="chart-view__cover" />
        <div class="chart-view__meta">
          <h2>{{ playlist.name }}</h2>
          <p v-if="playlist.description" class="chart-view__desc">{{ playlist.description }}</p>
          <p class="chart-view__count">{{ playlist.tracks.length }} 首歌曲</p>
        </div>
      </div>
      <TrackList
        :tracks="playlist.tracks"
        :playing-id="playerStore.currentTrack?.id"
        @play="onPlay"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import type { Playlist, Track, Platform } from "@/types";
import { exec } from "@/api/client";
import { extractRaw, adaptPlaylist } from "@/adapters";
import { usePlayerStore } from "@/stores/player";
import TrackList from "@/components/TrackList.vue";

const route = useRoute();
const playerStore = usePlayerStore();
const playlist = ref<Playlist | null>(null);
const loading = ref(false);
const error = ref("");

async function fetchPlaylist() {
  const platform = route.params.platform as Platform;
  const id = route.params.id as string;
  loading.value = true;
  error.value = "";
  try {
    const data = await exec(platform, "toplist", { id }) as { raw: unknown; contentType: string };
    const raw = extractRaw(data);
    playlist.value = adaptPlaylist(raw, platform);
    playlist.value.id = id;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

function onPlay(track: Track) {
  if (playlist.value) {
    playerStore.playTrack(track, playlist.value.tracks);
  }
}

onMounted(fetchPlaylist);
watch(() => route.params.id, fetchPlaylist);
</script>

<style scoped>
.chart-view__header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}
.chart-view__cover {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}
.chart-view__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.chart-view__meta h2 {
  font-size: 24px;
  font-weight: 600;
}
.chart-view__desc {
  font-size: 14px;
  color: #6B7280;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.chart-view__count {
  font-size: 13px;
  color: #9CA3AF;
}
.chart-view__loading,
.chart-view__error {
  text-align: center;
  padding: 64px 0;
  color: #6B7280;
}
.chart-view__retry {
  margin-top: 12px;
  padding: 8px 20px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
</style>
