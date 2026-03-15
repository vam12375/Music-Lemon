import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Track } from "@/types";
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
        downloadOne(task);
        active++;
      }
    }
  }

  /** 将选中项加入下载队列并启动 */
  function startDownload(allTracks: Track[]) {
    const selected = allTracks.filter(t => selectedIds.value.has(t.id));
    for (const track of selected) {
      if (!tasks.value.has(track.id)) {
        tasks.value.set(track.id, { track, status: "queued" });
      }
    }
    tasks.value = new Map(tasks.value);
    exitSelectMode();
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
    isSelectMode, selectedIds, selectedCount,
    enterSelectMode, exitSelectMode, toggleSelect, selectAll, deselectAll,
    tasks, taskList, doneCount, totalCount, hasActiveTasks,
    startDownload, clearCompleted,
  };
});
