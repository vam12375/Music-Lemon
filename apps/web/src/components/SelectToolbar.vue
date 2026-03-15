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
