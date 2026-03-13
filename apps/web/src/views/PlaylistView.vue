<template>
  <div class="playlist-view">
    <div v-if="loading" class="playlist-view__loading">加载中...</div>
    <ErrorState
      v-else-if="error"
      :message="errorMsg"
      :code="errorCode"
      @retry="fetchPlaylist"
    />
    <template v-else-if="playlist">
      <div class="playlist-view__header">
        <img v-if="playlist.cover" :src="playlist.cover" class="playlist-view__cover" />
        <div class="playlist-view__meta">
          <h2>{{ playlist.name }}</h2>
          <p v-if="playlist.description" class="playlist-view__desc">{{ playlist.description }}</p>
          <p class="playlist-view__count">{{ playlist.tracks.length }} 首歌曲</p>
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
import { exec, ApiError } from "@/api/client";
import { extractRaw, adaptPlaylist } from "@/adapters";
import { usePlayerStore } from "@/stores/player";
import TrackList from "@/components/TrackList.vue";
import ErrorState from "@/components/ErrorState.vue";

const route = useRoute();
const playerStore = usePlayerStore();
const playlist = ref<Playlist | null>(null);
const loading = ref(false);
const error = ref(false);
const errorMsg = ref("");
const errorCode = ref(0);

async function fetchPlaylist() {
  const platform = route.params.platform as Platform;
  const id = route.params.id as string;
  loading.value = true;
  error.value = false;
  try {
    const data = await exec(platform, "playlist", { id }) as { raw: unknown; contentType: string };
    const raw = extractRaw(data);
    playlist.value = adaptPlaylist(raw, platform);
    playlist.value.id = id;
  } catch (e) {
    error.value = true;
    errorMsg.value = e instanceof Error ? e.message : "加载失败";
    errorCode.value = e instanceof ApiError ? e.code : 0;
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
.playlist-view__header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}
.playlist-view__cover {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  object-fit: cover;
}
.playlist-view__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.playlist-view__meta h2 { font-size: 24px; font-weight: 600; }
.playlist-view__desc {
  font-size: 14px;
  color: #6B7280;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.playlist-view__count { font-size: 13px; color: #9CA3AF; }
.playlist-view__loading {
  text-align: center;
  padding: 64px 0;
  color: #6B7280;
}

@media (max-width: 768px) {
  .playlist-view__header { gap: 16px; }
  .playlist-view__cover { width: 120px; height: 120px; }
  .playlist-view__meta h2 { font-size: 18px; }
}
</style>
