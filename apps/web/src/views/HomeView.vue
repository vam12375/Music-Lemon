<template>
  <div class="home-view">
    <!-- 加载骨架屏 -->
    <div v-if="loading" class="home-view__skeleton">
      <!-- Hero 骨架 -->
      <div class="hero hero--skeleton">
        <div class="hero__bg-skeleton" />
      </div>
      <div class="chart-grid">
        <div v-for="i in 8" :key="i" class="chart-card chart-card--skeleton">
          <div class="chart-card__cover-skeleton" />
          <div class="chart-card__name-skeleton" />
        </div>
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

    <!-- 主内容 -->
    <template v-else>
      <!-- Hero 区域 -->
      <router-link
        v-if="charts[0]"
        :to="`/chart/${charts[0].platform}/${charts[0].id}`"
        class="hero"
      >
        <img
          v-if="charts[0].cover"
          :src="charts[0].cover"
          class="hero__bg"
          @error="onImgError"
        />
        <div class="hero__overlay" />
        <div class="hero__content">
          <h2 class="hero__title">{{ charts[0].name }}</h2>
          <p class="hero__meta">{{ charts[0].platform }} · 热门榜单</p>
          <span class="hero__btn">查看榜单</span>
        </div>
      </router-link>

      <!-- 分区标题 -->
      <div class="section-header">
        <div class="section-header__title">
          <span class="section-header__line" />
          <h3>热门榜单</h3>
        </div>
      </div>

      <!-- 榜单网格 -->
      <div class="chart-grid">
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
    </template>
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
/* Hero 区域 */
.hero {
  position: relative;
  height: 360px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  margin-bottom: 40px;
  text-decoration: none;
  color: inherit;
}
.hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(2px) brightness(0.4);
}
.hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(5,5,8,0.9) 0%, transparent 60%);
}
.hero__content {
  position: relative;
  z-index: 1;
  padding: 40px;
}
.hero__title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.hero__meta {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-transform: capitalize;
}
.hero__btn {
  display: inline-block;
  padding: 10px 24px;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-weight: 600;
  font-size: 14px;
  border-radius: var(--radius-sm);
  transition: opacity .15s;
}
.hero:hover .hero__btn { opacity: 0.85; }

.hero--skeleton {
  background: var(--bg-card);
  margin-bottom: 40px;
}
.hero__bg-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.section-header__title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-header__line {
  width: 4px;
  height: 20px;
  background: var(--gradient-accent);
  border-radius: 2px;
}
.section-header__title h3 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}
.chart-card {
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  transition: transform .3s, box-shadow .3s, border-color .3s;
}
.chart-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-glow);
  border-color: var(--border-active);
}
.chart-card__cover-wrap {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--bg-elevated);
}
.chart-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .3s;
}
.chart-card:hover .chart-card__cover {
  transform: scale(1.05);
}
.chart-card__name {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-card--skeleton { pointer-events: none; }
.chart-card__cover-skeleton {
  aspect-ratio: 1;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.chart-card__name-skeleton {
  margin: 10px 12px;
  height: 16px;
  width: 70%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
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
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .hero { height: 260px; }
  .hero__content { padding: 24px; }
  .hero__title { font-size: 24px; }
  .chart-grid { gap: 16px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
}
</style>
