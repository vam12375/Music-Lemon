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
/* === 设计系统：CSS 变量 === */
:root {
  /* 背景层级 */
  --bg-deep:    #050508;
  --bg-primary: #0A0A0F;
  --bg-card:    #12121A;
  --bg-elevated:#1A1A24;
  --bg-hover:   #22222E;

  /* 强调色（青绿渐变） */
  --accent:       #06D6A0;
  --accent-light: #00F5D4;
  --accent-glow:  rgba(6, 214, 160, 0.15);
  --gradient-accent: linear-gradient(135deg, #06D6A0, #00F5D4);

  /* 文字层级 */
  --text-primary:   #F0F0F5;
  --text-secondary: #8A8A9A;
  --text-muted:     #55556A;

  /* 边框 */
  --border-subtle: rgba(255,255,255,0.06);
  --border-active: rgba(6, 214, 160, 0.3);

  /* 功能色 */
  --success: #06D6A0;
  --error:   #FF4D6A;
  --warning: #FFB347;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* 阴影 */
  --shadow-card: 0 4px 24px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 20px var(--accent-glow);

  /* 毛玻璃 */
  --glass-bg: rgba(10,10,15,0.8);
  --glass-blur: blur(20px);
}

/* 全局样式 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: "Inter", "Noto Sans SC", system-ui, sans-serif;
  font-weight: 400;
  color: var(--text-primary);
  background: var(--bg-deep);
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

/* 全局滚动条 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 3px;
}

/* 响应式 - 平板 */
@media (max-width: 768px) {
  .main-content {
    padding: 16px 16px 88px;
  }
}
</style>
