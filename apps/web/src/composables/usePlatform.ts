import { ref, watch } from "vue";
import type { Platform } from "@/types";

const STORAGE_KEY = "tunehub_platform";

function loadPlatform(): Platform {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "netease" || saved === "qq" || saved === "kuwo") return saved;
  return "netease";
}

const currentPlatform = ref<Platform>(loadPlatform());

watch(currentPlatform, (val) => {
  localStorage.setItem(STORAGE_KEY, val);
});

export function usePlatform() {
  function setPlatform(p: Platform) {
    currentPlatform.value = p;
  }
  return { currentPlatform, setPlatform };
}
