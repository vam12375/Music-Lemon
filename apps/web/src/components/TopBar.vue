<template>
  <header class="top-bar">
    <div class="top-bar__inner">
      <!-- Logo -->
      <router-link to="/" class="top-bar__logo">TuneHub</router-link>

      <!-- 导航 -->
      <nav class="top-bar__nav">
        <router-link to="/" class="top-bar__link">发现</router-link>
        <router-link :to="`/search/${currentPlatform}`" class="top-bar__link">搜索</router-link>
      </nav>

      <!-- ID 解析入口 -->
      <div class="top-bar__parse" v-if="showParseInput">
        <input
          v-model="parseId"
          placeholder="输入歌曲 ID"
          class="top-bar__input"
          @keydown.enter="goParse"
        />
        <button class="top-bar__btn" @click="goParse" :disabled="!parseId.trim()">解析</button>
        <button class="top-bar__btn top-bar__btn--ghost" @click="showParseInput = false">取消</button>
      </div>
      <button v-else class="top-bar__btn top-bar__btn--ghost" @click="showParseInput = true">
        ID 解析
      </button>

      <!-- 平台切换 -->
      <div class="top-bar__platform">
        <button
          v-for="p in platforms"
          :key="p.value"
          :class="['top-bar__platform-btn', { active: currentPlatform === p.value }]"
          @click="onPlatformChange(p.value)"
        >{{ p.label }}</button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { Platform } from "@/types";
import { usePlatform } from "@/composables/usePlatform";

const router = useRouter();
const route = useRoute();
const { currentPlatform, setPlatform } = usePlatform();

const platforms = [
  { label: "网易云", value: "netease" as Platform },
  { label: "QQ", value: "qq" as Platform },
  { label: "酷我", value: "kuwo" as Platform },
];

const showParseInput = ref(false);
const parseId = ref("");

function goParse() {
  const id = parseId.value.trim();
  if (!id) return;
  router.push(`/player/${currentPlatform.value}/${id}`);
  parseId.value = "";
  showParseInput.value = false;
}

function onPlatformChange(p: Platform) {
  // 播放页禁用平台切换
  if (route.name === "player") return;
  setPlatform(p);
  // 若在搜索页，切换 URL 中的平台
  if (route.name === "search") {
    router.replace({ params: { platform: p }, query: route.query });
  } else if (route.name === "chart" || route.name === "playlist") {
    // 平台不匹配时回退首页
    router.push("/");
  }
}
</script>

<style scoped>
.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--border-subtle);
}
.top-bar__inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.top-bar__logo {
  font-size: 20px;
  font-weight: 700;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: none;
  flex-shrink: 0;
}
.top-bar__nav {
  display: flex;
  gap: 16px;
}
.top-bar__link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all .15s;
  position: relative;
}
.top-bar__link:hover { color: var(--text-primary); background: var(--bg-hover); }
.top-bar__link.router-link-exact-active {
  color: var(--accent);
  background: transparent;
}
.top-bar__link.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: var(--gradient-accent);
  border-radius: 1px;
}
.top-bar__parse {
  display: flex;
  gap: 8px;
  align-items: center;
}
.top-bar__input {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  width: 160px;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: border-color .15s;
}
.top-bar__input::placeholder { color: var(--text-muted); }
.top-bar__input:focus { border-color: var(--accent); }
.top-bar__btn {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  transition: opacity .15s;
}
.top-bar__btn:hover { opacity: 0.85; }
.top-bar__btn:disabled { opacity: .4; cursor: not-allowed; }
.top-bar__btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}
.top-bar__btn--ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
.top-bar__platform {
  margin-left: auto;
  display: flex;
  gap: 4px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 3px;
}
.top-bar__platform-btn {
  border: none;
  background: transparent;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all .15s;
}
.top-bar__platform-btn.active {
  background: var(--bg-elevated);
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,.3);
}

@media (max-width: 768px) {
  .top-bar__inner { padding: 0 12px; gap: 12px; }
  .top-bar__parse { display: none; }
  .top-bar__btn--ghost { display: none; }
  .top-bar__platform-btn { padding: 5px 10px; font-size: 12px; }
}
</style>
