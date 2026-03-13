<template>
  <div class="search-view">
    <!-- 搜索框 -->
    <div class="search-view__bar">
      <input
        v-model="keyword"
        class="search-view__input"
        placeholder="搜索歌曲、歌手..."
        @keydown.enter="doSearch(true)"
      />
      <button class="search-view__btn" @click="doSearch(true)" :disabled="!keyword.trim()">搜索</button>
    </div>

    <!-- 空态 -->
    <div v-if="!searchedOnce" class="search-view__empty">
      <p>输入关键词开始搜索</p>
    </div>

    <!-- 加载 -->
    <div v-else-if="loading && tracks.length === 0" class="search-view__loading">搜索中...</div>

    <!-- 结果 -->
    <template v-else-if="tracks.length > 0">
      <TrackList
        :tracks="tracks"
        :playing-id="playerStore.currentTrack?.id"
        @view="onView"
        @play="onPlay"
      />
      <div class="search-view__more">
        <button
          v-if="!noMore"
          class="search-view__more-btn"
          :disabled="loading"
          @click="loadMore"
        >
          {{ loading ? "加载中..." : "加载更多" }}
        </button>
        <p v-else class="search-view__no-more">没有更多了</p>
      </div>
    </template>

    <!-- 无结果 -->
    <div v-else-if="searchedOnce && !loading" class="search-view__empty">
      <p>未找到相关结果</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Track, Platform } from "@/types";
import { exec } from "@/api/client";
import { extractRaw, adaptSearchTracks } from "@/adapters";
import { usePlayerStore } from "@/stores/player";
import TrackList from "@/components/TrackList.vue";

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();

const keyword = ref((route.query.kw as string) ?? "");
const page = ref(Number(route.query.page) || 1);
const pageSize = 30;
const tracks = ref<Track[]>([]);
const loading = ref(false);
const noMore = ref(false);
const searchedOnce = ref(false);

async function doSearch(reset: boolean) {
  const kw = keyword.value.trim();
  if (!kw) return;

  if (reset) {
    page.value = 1;
    tracks.value = [];
    noMore.value = false;
  }

  // 更新 URL
  router.replace({ query: { kw, page: String(page.value) } });

  const platform = route.params.platform as Platform;
  loading.value = true;
  searchedOnce.value = true;
  try {
    const data = await exec(platform, "search", {
      keyword: kw,
      page: page.value,
      pageSize,
    }) as { raw: unknown; contentType: string };
    const raw = extractRaw(data);
    const newTracks = adaptSearchTracks(raw, platform);
    if (newTracks.length < pageSize) noMore.value = true;
    if (reset) {
      tracks.value = newTracks;
    } else {
      tracks.value = [...tracks.value, ...newTracks];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value++;
  doSearch(false);
}

function onView(track: Track) {
  playerStore.viewTrack(track, tracks.value);
}

function onPlay(track: Track) {
  playerStore.playTrack(track, tracks.value);
}

onMounted(() => {
  if (keyword.value.trim()) doSearch(true);
});
watch(() => route.params.platform, () => {
  if (keyword.value.trim()) doSearch(true);
});
</script>

<style scoped>
.search-view__bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.search-view__input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 15px;
  outline: none;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: border-color .15s, box-shadow .15s;
}
.search-view__input::placeholder { color: var(--text-muted); }
.search-view__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.search-view__btn {
  height: 44px;
  padding: 0 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.search-view__btn:hover { opacity: 0.85; }
.search-view__btn:disabled { opacity: .4; cursor: not-allowed; }
.search-view__more {
  text-align: center;
  padding: 24px 0;
}
.search-view__more-btn {
  padding: 10px 32px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: background .15s, border-color .15s;
}
.search-view__more-btn:hover { background: var(--bg-hover); border-color: var(--border-active); }
.search-view__more-btn:disabled { opacity: .4; cursor: not-allowed; }
.search-view__no-more { color: var(--text-muted); font-size: 14px; }
.search-view__empty,
.search-view__loading {
  text-align: center;
  padding: 64px 0;
  color: var(--text-secondary);
}
</style>
