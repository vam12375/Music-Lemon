<template>
  <div id="app">
    <TopBar />
    <main class="main-content">
      <router-view />
    </main>
    <MiniPlayer />
  </div>
</template>

<script setup lang="ts">
import TopBar from "@/components/TopBar.vue";
import MiniPlayer from "@/components/MiniPlayer.vue";
</script>

<style>
/* 全局样式 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-weight: 400;
  color: #111827;
  background: #F7F8FA;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 24px 96px;
  min-height: calc(100vh - 64px);
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  display: block;
  max-width: 100%;
}
</style>
