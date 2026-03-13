<template>
  <div class="detail-view">
    <!-- 加载详情中 -->
    <div v-if="detailLoading" class="detail-view__status">
      加载歌曲信息...
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 歌曲信息头部 -->
      <div class="detail-view__header" v-if="store.currentTrack?.title">
        <img
          v-if="store.currentTrack.cover"
          :src="store.currentTrack.cover"
          class="detail-view__header-cover"
        />
        <div v-else class="detail-view__header-cover detail-view__header-cover--placeholder" />
        <div class="detail-view__header-info">
          <h1 class="detail-view__title">{{ store.currentTrack.title }}</h1>
          <p class="detail-view__artist">{{ store.currentTrack.artist || "未知歌手" }}</p>
          <p v-if="albumName" class="detail-view__album">专辑：{{ albumName }}</p>
        </div>
      </div>

      <!-- 解析区域（类似 API 实验室请求配置） -->
      <div class="parse-card">
        <div class="parse-card__header">解析播放</div>
        <div class="parse-card__form">
          <div class="parse-card__field">
            <label class="parse-card__label">歌曲 ID / 链接</label>
            <input
              v-model="parseId"
              class="parse-card__input"
              placeholder="输入歌曲ID"
              :disabled="store.playState === 'loading'"
            />
          </div>
          <div class="parse-card__field parse-card__field--quality">
            <label class="parse-card__label">音质偏好</label>
            <select
              class="parse-card__select"
              :value="store.quality"
              @change="onQuality"
            >
              <option value="flac24bit">Hi-Res</option>
              <option value="flac">FLAC</option>
              <option value="320k">320k</option>
              <option value="128k">128k</option>
            </select>
          </div>
        </div>
        <button
          class="parse-card__submit"
          :disabled="!parseId.trim() || store.playState === 'loading'"
          @click="doParse"
        >
          {{ store.playState === 'loading' ? '解析中...' : '发送请求' }}
        </button>
      </div>

      <!-- 解析错误 -->
      <div v-if="store.playState === 'error' && !store.parseResult" class="result-card result-card--error">
        <div class="result-card__header">
          <span>解析失败</span>
          <span class="result-card__badge result-card__badge--error">Error</span>
        </div>
        <p class="result-card__error-msg">{{ store.errorMessage || "解析失败" }}</p>
        <button class="result-card__retry" @click="doParse">重试</button>
      </div>

      <!-- 响应结果（类似 API 实验室） -->
      <div v-if="store.parseResult" class="result-card">
        <div class="result-card__header">
          <span>响应结果</span>
          <span class="result-card__badge result-card__badge--ok">200 OK</span>
        </div>

        <!-- 统计栏 -->
        <div class="result-card__stats">
          <div class="result-card__stat">
            <span class="result-card__stat-label">总数</span>
            <span class="result-card__stat-value">{{ store.parseResult.total ?? resultItem ? 1 : 0 }}</span>
          </div>
          <div class="result-card__stat">
            <span class="result-card__stat-label">成功</span>
            <span class="result-card__stat-value result-card__stat-value--success">{{ store.parseResult.success_count ?? (resultItem?.success ? 1 : 0) }}</span>
          </div>
          <div class="result-card__stat">
            <span class="result-card__stat-label">失败</span>
            <span class="result-card__stat-value">{{ store.parseResult.fail_count ?? 0 }}</span>
          </div>
          <div class="result-card__stat">
            <span class="result-card__stat-label">缓存</span>
            <span class="result-card__stat-value result-card__stat-value--cache">{{ store.parseResult.cache_hit_count ?? 0 }}</span>
          </div>
          <div class="result-card__stat">
            <span class="result-card__stat-label">扣费</span>
            <span class="result-card__stat-value result-card__stat-value--cost">{{ store.parseResult.cost ?? 0 }} 积分</span>
          </div>
        </div>

        <!-- 歌曲结果卡片 -->
        <div v-if="resultItem" class="song-result">
          <div class="song-result__title-row">
            <span class="song-result__name">
              {{ resultItem.info?.name ?? store.currentTrack?.title ?? "未知" }}
              - {{ resultItem.info?.artist ?? store.currentTrack?.artist ?? "未知" }}
            </span>
            <span v-if="resultItem.fromCache" class="song-result__tag song-result__tag--cache">缓存</span>
            <span
              :class="['song-result__tag', resultItem.success ? 'song-result__tag--success' : 'song-result__tag--fail']"
            >
              {{ resultItem.success ? 'Success' : 'Failed' }}
            </span>
          </div>

          <div v-if="resultItem.success" class="song-result__body">
            <img
              v-if="resultItem.cover || store.currentTrack?.cover"
              :src="resultItem.cover || store.currentTrack?.cover"
              class="song-result__cover"
            />
            <div v-else class="song-result__cover song-result__cover--placeholder" />
            <table class="song-result__table">
              <tbody>
                <tr>
                  <td class="song-result__td-label">专辑</td>
                  <td>{{ resultItem.info?.album ?? albumName ?? "-" }}</td>
                  <td class="song-result__td-label">时长</td>
                  <td>{{ formatDuration(resultItem.info?.duration ?? store.currentTrack?.duration ?? 0) }}</td>
                </tr>
                <tr>
                  <td class="song-result__td-label">音质</td>
                  <td>
                    {{ resultItem.actualQuality ?? "-" }}
                    <span v-if="resultItem.wasDowngraded" class="song-result__downgrade">降级</span>
                  </td>
                  <td class="song-result__td-label">大小</td>
                  <td>{{ resultItem.fileSize ? formatFileSize(resultItem.fileSize) : "-" }}</td>
                </tr>
                <tr>
                  <td class="song-result__td-label">链接</td>
                  <td colspan="3">
                    <a
                      :href="resultItem.url"
                      target="_blank"
                      rel="noopener"
                      class="song-result__link"
                    >打开</a>
                    <button class="song-result__link-btn" @click="copyUrl(resultItem.url!)">复制</button>
                    <a
                      :href="getDownloadUrl(resultItem.url!, resultItem.info?.name, resultItem.info?.artist, resultItem.actualQuality)"
                      class="song-result__link-btn song-result__link-btn--download"
                    >下载</a>
                    <span v-if="copySuccess" class="song-result__copy-tip">已复制</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 查看歌词（可展开） -->
          <div v-if="resultItem.lyrics" class="song-result__section" @click="showLyrics = !showLyrics">
            <span>查看歌词</span>
            <span class="song-result__toggle">{{ showLyrics ? '∨' : '›' }}</span>
          </div>
          <div v-if="showLyrics && resultItem.lyrics" class="song-result__lyrics-box">
            <pre class="song-result__lyrics-text">{{ resultItem.lyrics }}</pre>
          </div>

          <!-- 查看原始 JSON（可展开） -->
          <div class="song-result__section" @click="showJson = !showJson">
            <span>查看原始 JSON</span>
            <span class="song-result__toggle">{{ showJson ? '∨' : '›' }}</span>
          </div>
          <div v-if="showJson" class="song-result__json-box">
            <pre class="song-result__json-text">{{ JSON.stringify(store.parseResult, null, 2) }}</pre>
          </div>
        </div>

        <!-- 解析失败但有响应 -->
        <div v-if="resultItem && !resultItem.success" class="result-card__error-msg">
          解析失败：无法获取播放链接
        </div>
      </div>

      <!-- 播放控制（解析成功后） -->
      <div v-if="store.playUrl" class="player-section">
        <div class="player-section__controls">
          <button class="player-section__btn" @click="store.prev" :disabled="!store.hasPrev">⏮</button>
          <button class="player-section__btn player-section__btn--main" @click="store.togglePlay">
            {{ store.playState === "playing" ? "⏸" : "▶" }}
          </button>
          <button class="player-section__btn" @click="store.next" :disabled="!store.hasNext">⏭</button>
        </div>
        <div class="player-section__progress">
          <span class="player-section__time">{{ formatTime(store.progress) }}</span>
          <input
            type="range"
            class="player-section__slider"
            min="0"
            :max="store.duration || 0"
            :value="store.progress"
            step="0.1"
            @input="onSeek"
          />
          <span class="player-section__time">{{ formatTime(store.duration) }}</span>
        </div>
      </div>

      <!-- 歌词面板（解析成功后，同步播放） -->
      <div v-if="store.playUrl && store.lyrics.length > 0" class="lyrics-panel" ref="lyricsContainer">
        <p
          v-for="(line, i) in store.lyrics"
          :key="i"
          :ref="(el) => { if (el) lyricRefs[i] = el as HTMLElement }"
          :class="['lyric-line', { 'lyric-line--active': i === activeLyricIndex }]"
          @click="store.seek(line.time)"
        >
          {{ line.text }}
        </p>
      </div>
      <div v-else-if="store.playUrl && store.rawLyricText" class="lyrics-panel">
        <pre class="lyrics-panel__raw">{{ store.rawLyricText }}</pre>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Platform, Quality } from "@/types";
import { usePlayerStore } from "@/stores/player";
import { songDetail } from "@/api/client";

const route = useRoute();
const router = useRouter();
const store = usePlayerStore();
const lyricsContainer = ref<HTMLElement | null>(null);
const lyricRefs = ref<HTMLElement[]>([]);

// 解析区域
const parseId = ref("");
const detailLoading = ref(false);
const albumName = ref("");
const showLyrics = ref(false);
const showJson = ref(false);
const copySuccess = ref(false);

// 当前解析结果的第一项
const resultItem = computed(() => store.parseResult?.data?.[0] ?? null);

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

// 页面初始化
onMounted(async () => {
  const platform = route.params.platform as Platform;
  const sourceId = route.params.sourceId as string;
  const trackId = `${platform}:${sourceId}`;

  // 自动填充歌曲 ID
  parseId.value = sourceId;

  // 如果 store 中已有此曲目的元数据，直接用
  if (store.currentTrack && store.currentTrack.id === trackId && store.currentTrack.title) {
    return;
  }

  // 没有元数据，从免费 API 获取
  detailLoading.value = true;
  try {
    const detail = await songDetail(platform, sourceId);
    store.viewTrack({
      id: trackId,
      title: detail.title,
      artist: detail.artist,
      cover: detail.cover,
      duration: detail.duration,
      platform,
      sourceId,
    });
    albumName.value = detail.album ?? "";
  } catch {
    // 免费 API 失败，创建占位曲目
    store.viewTrack({
      id: trackId,
      title: "",
      artist: "",
      cover: "",
      duration: 0,
      platform,
      sourceId,
    });
  } finally {
    detailLoading.value = false;
  }
});

/** 执行解析 */
function doParse() {
  const id = parseId.value.trim();
  if (!id) return;

  const platform = route.params.platform as Platform;
  const sourceId = route.params.sourceId as string;

  // 如果输入的 ID 与当前页面不同，导航到对应页面
  if (id !== sourceId) {
    router.push(`/player/${platform}/${id}`);
    return;
  }

  showLyrics.value = false;
  showJson.value = false;
  store.manualParse();
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch { /* 忽略 */ }
}

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function onSeek(e: Event) {
  store.seek(Number((e.target as HTMLInputElement).value));
}

function onQuality(e: Event) {
  store.setQuality((e.target as HTMLSelectElement).value as Quality);
}

/** 构造服务端代理下载链接 */
function getDownloadUrl(url: string, name?: string, artist?: string, quality?: string): string {
  const ext = quality?.includes("flac") ? "flac" : "mp3";
  const parts = [name || "未知", artist ? ` - ${artist}` : ""];
  const filename = `${parts.join("")}.${ext}`;
  return `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
}
</script>

<style scoped>
.detail-view {
  max-width: 960px;
  margin: 0 auto;
  padding-bottom: 100px;
}
.detail-view__status {
  text-align: center;
  padding: 80px 24px;
  color: var(--text-secondary);
  font-size: 16px;
}

/* === 歌曲信息头部 — 沉浸式 === */
.detail-view__header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  position: relative;
  overflow: hidden;
}
.detail-view__header-cover {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
  z-index: 1;
}
.detail-view__header-cover--placeholder {
  background: linear-gradient(135deg, var(--bg-elevated), var(--bg-hover));
}
.detail-view__header-info { z-index: 1; }
.detail-view__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}
.detail-view__artist {
  font-size: 14px;
  color: var(--text-secondary);
}
.detail-view__album {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* === 解析卡片 === */
.parse-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 20px;
}
.parse-card__header {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 20px;
}
.parse-card__form {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.parse-card__field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.parse-card__field--quality {
  flex: 0 0 160px;
}
.parse-card__label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}
.parse-card__input {
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  background: var(--bg-elevated);
  color: var(--text-primary);
  transition: border-color .15s;
}
.parse-card__input::placeholder { color: var(--text-muted); }
.parse-card__input:focus { border-color: var(--accent); }
.parse-card__input:disabled { background: var(--bg-primary); color: var(--text-muted); }
.parse-card__select {
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  outline: none;
}
.parse-card__select option { background: var(--bg-card); color: var(--text-primary); }
.parse-card__select:focus { border-color: var(--accent); }
.parse-card__submit {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.parse-card__submit:hover { opacity: 0.85; }
.parse-card__submit:disabled { opacity: .4; cursor: not-allowed; }

/* === 响应结果卡片 === */
.result-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 20px;
}
.result-card--error {
  border-color: rgba(255,77,106,0.3);
}
.result-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.result-card__badge {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 6px;
}
.result-card__badge--ok {
  color: var(--success);
  border: 1px solid rgba(6,214,160,0.3);
  background: rgba(6,214,160,0.08);
}
.result-card__badge--error {
  color: var(--error);
  border: 1px solid rgba(255,77,106,0.3);
  background: rgba(255,77,106,0.08);
}
.result-card__error-msg {
  color: var(--error);
  font-size: 14px;
  padding: 12px;
  background: rgba(255,77,106,0.08);
  border-radius: var(--radius-sm);
}
.result-card__retry {
  margin-top: 12px;
  padding: 6px 20px;
  border: 1px solid rgba(255,77,106,0.3);
  border-radius: 6px;
  background: transparent;
  color: var(--error);
  cursor: pointer;
  font-size: 13px;
}
.result-card__retry:hover { background: rgba(255,77,106,0.08); }

/* 统计栏 */
.result-card__stats {
  display: flex;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 20px;
}
.result-card__stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-right: 1px solid var(--border-subtle);
  font-size: 13px;
}
.result-card__stat:last-child { border-right: none; }
.result-card__stat-label { color: var(--text-secondary); }
.result-card__stat-value { font-weight: 600; color: var(--text-primary); }
.result-card__stat-value--success { color: var(--success); }
.result-card__stat-value--cache { color: var(--accent); }
.result-card__stat-value--cost { color: var(--error); }

/* === 歌曲结果 === */
.song-result {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.song-result__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-weight: 600;
  color: var(--text-primary);
}
.song-result__name { flex: 1; }
.song-result__tag {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 4px;
}
.song-result__tag--success {
  color: var(--success);
  border: 1px solid rgba(6,214,160,0.3);
}
.song-result__tag--fail {
  color: var(--error);
  border: 1px solid rgba(255,77,106,0.3);
}
.song-result__tag--cache {
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}
.song-result__body {
  display: flex;
  gap: 16px;
  padding: 16px;
}
.song-result__cover {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}
.song-result__cover--placeholder {
  background: var(--bg-hover);
}
.song-result__table {
  flex: 1;
  font-size: 13px;
  border-collapse: collapse;
  color: var(--text-primary);
}
.song-result__table td {
  padding: 6px 12px 6px 0;
  vertical-align: middle;
}
.song-result__td-label {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  width: 50px;
}
.song-result__downgrade {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  color: var(--warning);
  border: 1px solid rgba(255,179,71,0.3);
  border-radius: 3px;
  padding: 0 4px;
}
.song-result__link {
  color: var(--accent);
  text-decoration: none;
  font-size: 13px;
  margin-right: 12px;
}
.song-result__link:hover { text-decoration: underline; }
.song-result__link-btn {
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  padding: 2px 10px;
  cursor: pointer;
}
.song-result__link-btn:hover { background: var(--bg-hover); }
.song-result__link-btn--download {
  text-decoration: none;
  color: var(--success);
  border-color: rgba(6,214,160,0.3);
  margin-left: 8px;
}
.song-result__link-btn--download:hover { background: rgba(6,214,160,0.08); }
.song-result__copy-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--success);
}

/* 可展开区域 */
.song-result__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  user-select: none;
  transition: background .15s;
}
.song-result__section:hover { background: var(--bg-hover); }
.song-result__toggle {
  color: var(--text-muted);
  font-size: 16px;
}
.song-result__lyrics-box {
  padding: 16px;
  border-top: 1px solid var(--border-subtle);
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-elevated);
}
.song-result__lyrics-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}
.song-result__json-box {
  padding: 16px;
  border-top: 1px solid var(--border-subtle);
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-primary);
  border-radius: 0 0 8px 8px;
}
.song-result__json-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
  font-family: "Consolas", "Monaco", monospace;
}

/* === 播放控制 === */
.player-section {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.player-section__controls {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.player-section__btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background .15s, color .15s;
}
.player-section__btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.player-section__btn:disabled { opacity: .3; cursor: not-allowed; }
/* 主播放按钮 56px 青绿渐变 */
.player-section__btn--main {
  width: 56px;
  height: 56px;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 20px;
  transition: transform .15s, box-shadow .15s;
}
.player-section__btn--main:hover {
  transform: scale(1.08);
  box-shadow: var(--shadow-glow);
}
.player-section__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 500px;
}
.player-section__time {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}
/* 进度条青绿渐变轨道 */
.player-section__slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.player-section__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

/* === 歌词面板 === */
.lyrics-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}
.lyrics-panel__raw {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 2;
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}
.lyric-line {
  padding: 8px 0;
  font-size: 15px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color .2s, font-size .2s, text-shadow .2s;
  line-height: 1.8;
}
.lyric-line:hover { color: var(--text-secondary); }
/* 当前行：18px + bold + accent + glow */
.lyric-line--active {
  color: var(--accent);
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 0 20px var(--accent-glow);
}

/* 响应式 */
@media (max-width: 768px) {
  .detail-view__header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  .detail-view__header-cover {
    width: 100px;
    height: 100px;
  }
  .parse-card__form {
    flex-direction: column;
    gap: 12px;
  }
  .parse-card__field--quality {
    flex: 1;
  }
  .result-card__stats {
    flex-wrap: wrap;
  }
  .result-card__stat {
    flex: 1 1 45%;
    border-bottom: 1px solid var(--border-subtle);
  }
  .song-result__body {
    flex-direction: column;
    align-items: center;
  }
  .song-result__table {
    width: 100%;
  }
  .lyric-line { text-align: center; }
}
</style>
