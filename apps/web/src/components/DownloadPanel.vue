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
          <span :class="['download-panel__icon', `download-panel__icon--${task.status}`]">
            <template v-if="task.status === 'done'">&#10003;</template>
            <template v-else-if="task.status === 'error'">&#10007;</template>
            <template v-else-if="task.status === 'queued'">&#9724;</template>
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
        <div v-if="!downloadStore.hasActiveTasks" class="download-panel__footer">
          <button class="download-panel__clear" @click="downloadStore.clearCompleted()">
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
  bottom: 80px;
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
.download-panel__icon--done { color: var(--success); }
.download-panel__icon--error { color: var(--error); }
.download-panel__icon--queued { color: var(--text-muted); }
.download-panel__icon--parsing,
.download-panel__icon--downloading { color: var(--accent); }
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
