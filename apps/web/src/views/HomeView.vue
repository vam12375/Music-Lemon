<template>
  <div class="home-view">
    <h2 class="home-view__title">发现音乐</h2>
    <p class="home-view__subtitle">热门榜单</p>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="chart-grid">
      <div v-for="i in 8" :key="i" class="chart-card chart-card--skeleton">
        <div class="chart-card__cover-skeleton" />
        <div class="chart-card__name-skeleton" />
      </div>
    </div>

    <!-- 错误状态 -->
    <ErrorState
      v-else-if="error"
      :message="errorMsg"
      :code="errorCode"
      @retry="fetchCharts"
    />

    <!-- 空状态 -->
    <div v-else-if="charts.length === 0" class="home-view__empty">
      <p>暂无榜单数据</p>
    </div>

    <!-- 榜单网格 -->
    <div v-else class="chart-grid">
      <router-link
        v-for="chart in charts"
        :key="chart.id"
        :to="`/chart/${chart.platform}/${chart.id}`"
        class="chart-card"
      >
        <div class="chart-card__cover-wrap">
          <img
            :src="chart.cover"
            :alt="chart.name"
            class="chart-card__cover"
            loading="lazy"
            @error="onImgError"
          />
        </div>
        <p class="chart-card__name">{{ chart.name }}</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Chart } from "@/types";
import { exec, ApiError } from "@/api/client";
import { extractRaw, adaptCharts } from "@/adapters";
import { usePlatform } from "@/composables/usePlatform";
import ErrorState from "@/components/ErrorState.vue";

const { currentPlatform } = usePlatform();
const charts = ref<Chart[]>([]);
const loading = ref(false);
const error = ref(false);
const errorMsg = ref("");
const errorCode = ref(0);

async function fetchCharts() {
  loading.value = true;
  error.value = false;
  try {
    const data = await exec(currentPlatform.value, "toplists") as { raw: unknown; contentType: string };
    const raw = extractRaw(data);
    charts.value = adaptCharts(raw, currentPlatform.value);
  } catch (e) {
    error.value = true;
    errorMsg.value = e instanceof Error ? e.message : "加载失败";
    errorCode.value = e instanceof ApiError ? e.code : 0;
  } finally {
    loading.value = false;
  }
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.style.display = "none";
}

onMounted(fetchCharts);
watch(currentPlatform, fetchCharts);
</script>

<style scoped>
.home-view__title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 4px;
}
.home-view__subtitle {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 24px;
}
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}
.chart-card {
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #E5E7EB;
  transition: transform .2s, box-shadow .2s;
}
.chart-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
}
.chart-card__cover-wrap {
  aspect-ratio: 1;
  overflow: hidden;
  background: #F3F4F6;
}
.chart-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chart-card__name {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 骨架屏 */
.chart-card--skeleton { pointer-events: none; }
.chart-card__cover-skeleton {
  aspect-ratio: 1;
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.chart-card__name-skeleton {
  margin: 10px 12px;
  height: 16px;
  width: 70%;
  border-radius: 4px;
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.home-view__empty {
  text-align: center;
  padding: 64px 0;
  color: #6B7280;
}
</style>
