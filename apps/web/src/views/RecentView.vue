<template>
  <div class="recent-view">
    <h2 class="recent-view__title">最近播放</h2>

    <!-- 空状态 -->
    <div v-if="recentTracks.length === 0" class="recent-view__empty">
      暂无播放记录
    </div>

    <!-- 列表 -->
    <template v-else>
      <SelectToolbar :tracks="recentTracks" />
      <TrackList
        :tracks="recentTracks"
        :playing-id="playerStore.currentTrack?.id"
        :selectable="downloadStore.isSelectMode"
        :selected-ids="downloadStore.selectedIds"
        @view="onView"
        @play="onPlay"
        @select="downloadStore.toggleSelect"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Track } from "@/types";
import { usePlayerStore } from "@/stores/player";
import { useRecentTracks } from "@/composables/useRecentTracks";
import TrackList from "@/components/TrackList.vue";
import SelectToolbar from "@/components/SelectToolbar.vue";
import { useDownloadStore } from "@/stores/download";

const playerStore = usePlayerStore();
const downloadStore = useDownloadStore();
const { recentTracks } = useRecentTracks();

function onView(track: Track) {
  playerStore.viewTrack(track, recentTracks.value);
}

function onPlay(track: Track) {
  playerStore.playTrack(track, recentTracks.value);
}
</script>

<style scoped>
.recent-view__title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 24px;
}
.recent-view__empty {
  text-align: center;
  padding: 64px 0;
  color: var(--text-secondary);
  font-size: 15px;
}
</style>
