# 多选下载功能 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在所有 TrackList 页面支持多选歌曲批量下载，含并发控制和底部进度面板。

**Architecture:** 新增独立 `download` Pinia store 管理多选状态和下载队列引擎（并发=2）。TrackList 扩展 selectable props 支持多选 UI。新增 SelectToolbar 工具栏组件和 DownloadPanel 底部浮动进度面板。

**Tech Stack:** Vue 3 Composition API, Pinia, 原生 CSS (BEM)

**Design Doc:** `docs/plans/2026-03-15-batch-download-design.md`

---

## Task 1: 创建 Download Store

**Files:**
- Create: `apps/web/src/stores/download.ts`

**Step 1: 创建 download store 核心骨架**

```typescript
// apps/web/src/stores/download.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Track, Quality } from "@/types";
import { parse } from "@/api/client";
import type { ParseResponse } from "@/stores/player";
import { usePlayerStore } from "@/stores/player";

/** 单个下载任务状态 */
export type DownloadStatus = "queued" | "parsing" | "downloading" | "done" | "error";

export interface DownloadTask {
  track: Track;
  status: DownloadStatus;
  error?: string;
}

/** 最大并发下载数 */
const MAX_CONCURRENCY = 2;

export const useDownloadStore = defineStore("download", () => {
  // ── 多选状态 ──
  const isSelectMode = ref(false);
  const selectedIds = ref(new Set<string>());

  // ── 下载队列 ──
  const tasks = ref(new Map<string, DownloadTask>());

  // ── 计算属性 ──
  const selectedCount = computed(() => selectedIds.value.size);
  const taskList = computed(() => Array.from(tasks.value.values()));
  const doneCount = computed(() => taskList.value.filter(t => t.status === "done").length);
  const totalCount = computed(() => tasks.value.size);
  const hasActiveTasks = computed(() =>
    taskList.value.some(t => t.status === "queued" || t.status === "parsing" || t.status === "downloading"),
  );

  // ── 多选操作 ──
  function enterSelectMode() {
    isSelectMode.value = true;
  }

  function exitSelectMode() {
    isSelectMode.value = false;
    selectedIds.value = new Set();
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  }

  function selectAll(tracks: Track[]) {
    selectedIds.value = new Set(tracks.map(t => t.id));
  }

  function deselectAll() {
    selectedIds.value = new Set();
  }

  // ── 下载引擎 ──

  /** 根据音质判断文件扩展名 */
  function getExt(quality: string): string {
    return quality.includes("flac") ? "flac" : "mp3";
  }

  /** 构建下载文件名 */
  function buildFilename(track: Track, quality: string, name?: string, artist?: string): string {
    const ext = getExt(quality);
    const title = name || track.title || "未知";
    const art = artist ? ` - ${artist}` : (track.artist ? ` - ${track.artist}` : "");
    return `${title}${art}.${ext}`;
  }

  /** 触发浏览器下载（隐藏 <a> 标签） */
  function triggerBrowserDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /** 处理单首下载任务 */
  async function downloadOne(task: DownloadTask) {
    const playerStore = usePlayerStore();
    const quality = playerStore.quality;

    // 解析阶段
    task.status = "parsing";
    // 触发响应式更新
    tasks.value = new Map(tasks.value);

    try {
      const data = await parse(task.track.platform, task.track.sourceId, quality) as ParseResponse;
      const item = data.data?.[0];

      if (!item || !item.success || !item.url) {
        task.status = "error";
        task.error = "解析失败：无法获取下载链接";
        tasks.value = new Map(tasks.value);
        processQueue();
        return;
      }

      // 下载阶段
      task.status = "downloading";
      tasks.value = new Map(tasks.value);

      const filename = buildFilename(
        task.track,
        item.actualQuality || quality,
        item.info?.name,
        item.info?.artist,
      );
      triggerBrowserDownload(item.url, filename);

      task.status = "done";
      tasks.value = new Map(tasks.value);
    } catch (e) {
      task.status = "error";
      task.error = e instanceof Error ? e.message : "下载失败";
      tasks.value = new Map(tasks.value);
    }

    // 处理队列中的下一个
    processQueue();
  }

  /** 并发控制器：维持 ≤ MAX_CONCURRENCY 个并行任务 */
  function processQueue() {
    const activeTasks = taskList.value.filter(
      t => t.status === "parsing" || t.status === "downloading",
    );
    let active = activeTasks.length;

    for (const task of taskList.value) {
      if (active >= MAX_CONCURRENCY) break;
      if (task.status === "queued") {
        downloadOne(task); // 不 await，并行执行
        active++;
      }
    }
  }

  /** 将选中项加入下载队列并启动 */
  function startDownload(allTracks: Track[]) {
    const selected = allTracks.filter(t => selectedIds.value.has(t.id));
    for (const track of selected) {
      // 避免重复添加
      if (!tasks.value.has(track.id)) {
        tasks.value.set(track.id, { track, status: "queued" });
      }
    }
    // 触发响应式更新
    tasks.value = new Map(tasks.value);
    // 退出多选模式
    exitSelectMode();
    // 启动队列处理
    processQueue();
  }

  /** 清理已完成和失败的任务 */
  function clearCompleted() {
    const next = new Map<string, DownloadTask>();
    for (const [id, task] of tasks.value) {
      if (task.status !== "done" && task.status !== "error") {
        next.set(id, task);
      }
    }
    tasks.value = next;
  }

  return {
    // 多选状态
    isSelectMode, selectedIds, selectedCount,
    enterSelectMode, exitSelectMode, toggleSelect, selectAll, deselectAll,
    // 下载队列
    tasks, taskList, doneCount, totalCount, hasActiveTasks,
    startDownload, clearCompleted,
  };
});
```

**Step 2: 验证编译通过**

Run: `cd apps/web && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 无 download.ts 相关错误

**Step 3: Commit**

```bash
git add apps/web/src/stores/download.ts
git commit -m "feat(web): 新增 download store — 多选状态管理与并发下载引擎"
```

---

## Task 2: 改造 TrackList 支持多选模式

**Files:**
- Modify: `apps/web/src/components/TrackList.vue`

**Step 1: 扩展 Props 和 Emits**

在 `<script setup>` 中（原 L39-47），替换为：

```typescript
defineProps<{
  tracks: Track[];
  playingId?: string;
  selectable?: boolean;       // 是否处于多选模式
  selectedIds?: Set<string>;  // 已选中的 track.id 集合
}>();

defineEmits<{
  view: [track: Track, index: number];
  play: [track: Track, index: number];
  select: [trackId: string];  // 切换选中
}>();
```

**Step 2: 改造模板**

替换整个 `<template>` 为：

```html
<template>
  <div class="track-list">
    <div
      v-for="(track, index) in tracks"
      :key="track.id"
      :class="[
        'track-item',
        { 'track-item--active': track.id === playingId },
        { 'track-item--selected': selectable && selectedIds?.has(track.id) },
      ]"
      @click="selectable ? $emit('select', track.id) : undefined"
    >
      <!-- 多选模式：复选框 / 正常模式：序号 -->
      <label v-if="selectable" class="track-item__checkbox" @click.stop>
        <input
          type="checkbox"
          :checked="selectedIds?.has(track.id)"
          @change="$emit('select', track.id)"
        />
        <span class="track-item__checkmark" />
      </label>
      <span v-else class="track-item__index">{{ index + 1 }}</span>

      <!-- 点击行跳转详情页（仅查看，不解析） -->
      <component
        :is="selectable ? 'div' : 'router-link'"
        :to="selectable ? undefined : `/player/${track.platform}/${track.sourceId}`"
        class="track-item__link"
        @click="selectable ? undefined : $emit('view', track, index)"
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
      </component>
      <span class="track-item__duration">{{ formatDuration(track.duration) }}</span>
      <button v-if="!selectable" class="track-item__play" @click.stop="$emit('play', track, index)">
        ▶
      </button>
    </div>
  </div>
</template>
```

**Step 3: 新增复选框 CSS**

在 `<style scoped>` 末尾（`</style>` 前）追加：

```css
/* 多选模式 */
.track-item--selected {
  background: var(--accent-glow);
}
.track-item__checkbox {
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}
.track-item__checkbox input {
  display: none;
}
.track-item__checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--text-muted);
  border-radius: 4px;
  transition: all 0.15s;
  position: relative;
}
.track-item__checkbox input:checked + .track-item__checkmark {
  background: var(--accent);
  border-color: var(--accent);
}
.track-item__checkbox input:checked + .track-item__checkmark::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid var(--bg-deep);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
```

**Step 4: 验证编译**

Run: `cd apps/web && npx vue-tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add apps/web/src/components/TrackList.vue
git commit -m "feat(web): TrackList 新增多选模式 — 复选框/选中高亮/行点击选中"
```

---

## Task 3: 创建 SelectToolbar 组件

**Files:**
- Create: `apps/web/src/components/SelectToolbar.vue`

**Step 1: 创建工具栏组件**

```vue
<!-- apps/web/src/components/SelectToolbar.vue -->
<template>
  <div class="select-toolbar">
    <template v-if="!downloadStore.isSelectMode">
      <button class="select-toolbar__enter" @click="downloadStore.enterSelectMode()">
        批量操作
      </button>
    </template>
    <template v-else>
      <label class="select-toolbar__check-all">
        <input
          type="checkbox"
          :checked="isAllSelected"
          :indeterminate="isPartialSelected"
          @change="onToggleAll"
        />
        <span>全选</span>
      </label>
      <span class="select-toolbar__count">已选 {{ downloadStore.selectedCount }} 首</span>
      <button
        class="select-toolbar__download"
        :disabled="downloadStore.selectedCount === 0"
        @click="onDownload"
      >
        下载
      </button>
      <button class="select-toolbar__cancel" @click="downloadStore.exitSelectMode()">
        取消
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Track } from "@/types";
import { useDownloadStore } from "@/stores/download";

const props = defineProps<{
  tracks: Track[];
}>();

const downloadStore = useDownloadStore();

const isAllSelected = computed(() =>
  props.tracks.length > 0 && props.tracks.every(t => downloadStore.selectedIds.has(t.id)),
);

const isPartialSelected = computed(() =>
  !isAllSelected.value && props.tracks.some(t => downloadStore.selectedIds.has(t.id)),
);

function onToggleAll() {
  if (isAllSelected.value) {
    downloadStore.deselectAll();
  } else {
    downloadStore.selectAll(props.tracks);
  }
}

function onDownload() {
  downloadStore.startDownload(props.tracks);
}
</script>

<style scoped>
.select-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
}
.select-toolbar__enter {
  padding: 6px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.select-toolbar__enter:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.select-toolbar__check-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}
.select-toolbar__check-all input {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}
.select-toolbar__count {
  font-size: 13px;
  color: var(--text-muted);
  margin-left: auto;
}
.select-toolbar__download {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.select-toolbar__download:hover { opacity: 0.85; }
.select-toolbar__download:disabled { opacity: 0.4; cursor: not-allowed; }
.select-toolbar__cancel {
  padding: 6px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.select-toolbar__cancel:hover {
  border-color: var(--error);
  color: var(--error);
}
</style>
```

**Step 2: 验证编译**

Run: `cd apps/web && npx vue-tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/components/SelectToolbar.vue
git commit -m "feat(web): 新增 SelectToolbar 组件 — 批量操作/全选/下载/取消"
```

---

## Task 4: 创建 DownloadPanel 底部进度面板

**Files:**
- Create: `apps/web/src/components/DownloadPanel.vue`

**Step 1: 创建进度面板组件**

```vue
<!-- apps/web/src/components/DownloadPanel.vue -->
<template>
  <Transition name="panel-slide">
    <div v-if="downloadStore.totalCount > 0" class="download-panel" :class="{ 'download-panel--collapsed': collapsed }">
      <!-- 标题栏（始终显示） -->
      <div class="download-panel__header" @click="collapsed = !collapsed">
        <span class="download-panel__title">
          下载进度 {{ downloadStore.doneCount }}/{{ downloadStore.totalCount }}
        </span>
        <button class="download-panel__toggle">
          {{ collapsed ? '▲' : '▼' }}
        </button>
      </div>

      <!-- 任务列表（展开时显示） -->
      <div v-if="!collapsed" class="download-panel__body">
        <div
          v-for="task in downloadStore.taskList"
          :key="task.track.id"
          class="download-panel__item"
        >
          <span class="download-panel__icon">
            <template v-if="task.status === 'done'">✓</template>
            <template v-else-if="task.status === 'error'">✕</template>
            <template v-else-if="task.status === 'queued'">⏸</template>
            <template v-else>
              <span class="download-panel__spinner" />
            </template>
          </span>
          <span class="download-panel__name">{{ task.track.title }} - {{ task.track.artist }}</span>
          <span :class="['download-panel__status', `download-panel__status--${task.status}`]">
            {{ statusLabel(task.status, task.error) }}
          </span>
        </div>

        <!-- 底部操作 -->
        <div class="download-panel__footer">
          <button
            v-if="!downloadStore.hasActiveTasks"
            class="download-panel__clear"
            @click="downloadStore.clearCompleted()"
          >
            清除全部
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useDownloadStore, type DownloadStatus } from "@/stores/download";

const downloadStore = useDownloadStore();
const collapsed = ref(false);

function statusLabel(status: DownloadStatus, error?: string): string {
  switch (status) {
    case "queued": return "等待中";
    case "parsing": return "解析中...";
    case "downloading": return "下载中...";
    case "done": return "完成";
    case "error": return error || "失败";
  }
}
</script>

<style scoped>
.download-panel {
  position: fixed;
  bottom: 80px; /* MiniPlayer 上方 */
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  z-index: 900;
  overflow: hidden;
}
.download-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  background: var(--bg-elevated);
}
.download-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.download-panel__toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
}
.download-panel__body {
  max-height: 240px;
  overflow-y: auto;
}
.download-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  border-top: 1px solid var(--border-subtle);
}
.download-panel__icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  font-size: 12px;
}
.download-panel__status--done .download-panel__icon,
.download-panel__item:has(.download-panel__status--done) .download-panel__icon {
  color: var(--success);
}
/* 状态图标颜色通过 status class 控制 */
.download-panel__name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}
.download-panel__status {
  flex-shrink: 0;
  font-size: 12px;
}
.download-panel__status--done { color: var(--success); }
.download-panel__status--error { color: var(--error); }
.download-panel__status--queued { color: var(--text-muted); }
.download-panel__status--parsing,
.download-panel__status--downloading { color: var(--accent); }

/* 旋转加载动画 */
.download-panel__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.download-panel__footer {
  padding: 8px 16px;
  text-align: center;
  border-top: 1px solid var(--border-subtle);
}
.download-panel__clear {
  padding: 4px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.download-panel__clear:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 入场/出场动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
}
</style>
```

**Step 2: 验证编译**

Run: `cd apps/web && npx vue-tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/components/DownloadPanel.vue
git commit -m "feat(web): 新增 DownloadPanel 组件 — 底部浮动下载进度面板"
```

---

## Task 5: 集成到 4 个 View 页面

**Files:**
- Modify: `apps/web/src/views/SearchView.vue`
- Modify: `apps/web/src/views/ChartView.vue`
- Modify: `apps/web/src/views/PlaylistView.vue`
- Modify: `apps/web/src/views/RecentView.vue`

所有页面的改造模式相同：
1. 导入 `SelectToolbar` 和 `useDownloadStore`
2. 在 TrackList 上方放置 `<SelectToolbar :tracks="..." />`
3. 给 TrackList 传入 `selectable` / `selectedIds` / `@select` props

### Step 1: 改造 SearchView.vue

在 `<script setup>` 中追加导入（L56-57 后）：

```typescript
import SelectToolbar from "@/components/SelectToolbar.vue";
import { useDownloadStore } from "@/stores/download";

const downloadStore = useDownloadStore();
```

在模板中 TrackList 上方添加 `<SelectToolbar>`，并给 TrackList 加上多选 props。
将原 L23-29 替换为：

```html
<template v-else-if="tracks.length > 0">
  <SelectToolbar :tracks="tracks" />
  <TrackList
    :tracks="tracks"
    :playing-id="playerStore.currentTrack?.id"
    :selectable="downloadStore.isSelectMode"
    :selected-ids="downloadStore.selectedIds"
    @view="onView"
    @play="onPlay"
    @select="downloadStore.toggleSelect"
  />
```

### Step 2: 改造 ChartView.vue

在 `<script setup>` 中追加导入（L41-42 后）：

```typescript
import SelectToolbar from "@/components/SelectToolbar.vue";
import { useDownloadStore } from "@/stores/download";

const downloadStore = useDownloadStore();
```

将原 L24-29 替换为：

```html
      <SelectToolbar :tracks="playlist.tracks" />
      <TrackList
        :tracks="playlist.tracks"
        :playing-id="playerStore.currentTrack?.id"
        :selectable="downloadStore.isSelectMode"
        :selected-ids="downloadStore.selectedIds"
        @view="onView"
        @play="onPlay"
        @select="downloadStore.toggleSelect"
      />
```

### Step 3: 改造 PlaylistView.vue

与 ChartView 相同模式。导入 `SelectToolbar` + `useDownloadStore`，给 TrackList 前加 `<SelectToolbar :tracks="playlist.tracks" />`，给 TrackList 加多选 props。

### Step 4: 改造 RecentView.vue

与上方相同模式。导入后给 TrackList 前加 `<SelectToolbar :tracks="recentTracks" />`，给 TrackList 加多选 props。

### Step 5: 验证编译

Run: `cd apps/web && npx vue-tsc --noEmit 2>&1 | head -20`

### Step 6: Commit

```bash
git add apps/web/src/views/SearchView.vue apps/web/src/views/ChartView.vue apps/web/src/views/PlaylistView.vue apps/web/src/views/RecentView.vue
git commit -m "feat(web): 4 个 View 页面集成多选工具栏与 TrackList 多选 props"
```

---

## Task 6: 挂载 DownloadPanel 到 App.vue

**Files:**
- Modify: `apps/web/src/App.vue`

**Step 1: 在 App.vue 中添加 DownloadPanel**

在 `<script setup>` 中追加导入：

```typescript
import DownloadPanel from "@/components/DownloadPanel.vue";
```

在模板 `<MiniPlayer />` 上方添加：

```html
    <DownloadPanel />
    <MiniPlayer />
```

**Step 2: 验证编译**

Run: `cd apps/web && npx vue-tsc --noEmit 2>&1 | head -20`

**Step 3: 手动验证**

启动开发服务器（`npm run dev`），验证：
1. 搜索页出现「批量操作」按钮
2. 点击后进入多选模式，序号变复选框
3. 勾选歌曲后点击「下载」
4. 底部弹出进度面板，显示解析/下载状态
5. 下载完成后可清除任务

**Step 4: Commit**

```bash
git add apps/web/src/App.vue
git commit -m "feat(web): App.vue 挂载 DownloadPanel 全局下载进度面板"
```
