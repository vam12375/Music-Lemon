import { ref, watch } from "vue";
import type { Track } from "@/types";

const STORAGE_KEY = "music-lemon_recent";
const MAX_ITEMS = 50;

function load(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

const recentTracks = ref<Track[]>(load());

/* 持久化到 localStorage */
watch(recentTracks, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

export function useRecentTracks() {
  /** 添加一条播放记录（去重，最新在前） */
  function addRecent(track: Track) {
    const list = recentTracks.value.filter((t) => t.id !== track.id);
    list.unshift(track);
    recentTracks.value = list.slice(0, MAX_ITEMS);
  }

  /** 清空播放记录 */
  function clearRecent() {
    recentTracks.value = [];
  }

  return { recentTracks, addRecent, clearRecent };
}
