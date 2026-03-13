# Music-Lemon UI Dark Theme Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all 10 UI files from light theme to dark theme with cyan-green accent, glassmorphism effects, and immersive design.

**Architecture:** Pure CSS refactoring — inject global CSS variables in App.vue, then update each component's scoped styles to use variables + new dark theme colors. No JS logic changes, no new dependencies, no structural changes to templates (except HomeView Hero section and ErrorState SVG icons).

**Tech Stack:** Vue 3 SFC + scoped CSS + CSS custom properties

**Design Reference:** `docs/plans/2026-03-13-ui-redesign-dark-theme.md`

---

## Phase 1: Design System Foundation

### Task 1: App.vue — Global CSS Variables & Dark Background

**Files:**
- Modify: `apps/web/src/App.vue`

**Step 1: Replace the entire `<style>` block**

Replace the existing global styles with the dark theme design system:

```css
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
```

**Step 2: Verify** — run `cd apps/web && npx vite build --mode development 2>&1 | head -5` to check no syntax errors.

**Step 3: Commit**

```bash
git add apps/web/src/App.vue
git commit -m "feat(ui): 注入暗黑主题设计系统全局 CSS 变量"
```

---

## Phase 2: Common Components

### Task 2: TopBar.vue — Glassmorphism Navigation

**Files:**
- Modify: `apps/web/src/components/TopBar.vue`

**Step 1: Replace the entire `<style scoped>` block**

```css
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
/* Logo 青绿渐变 */
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
/* 选中态底部2px青绿线 */
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
/* 平台切换胶囊 */
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

/* 响应式 */
@media (max-width: 768px) {
  .top-bar__inner { padding: 0 12px; gap: 12px; }
  .top-bar__parse { display: none; }
  .top-bar__btn--ghost { display: none; }
  .top-bar__platform-btn { padding: 5px 10px; font-size: 12px; }
}
</style>
```

**Step 2: Commit**

```bash
git add apps/web/src/components/TopBar.vue
git commit -m "feat(ui): TopBar 暗黑毛玻璃导航 + 青绿强调色"
```

---

### Task 3: MiniPlayer.vue — Glassmorphism Player

**Files:**
- Modify: `apps/web/src/components/MiniPlayer.vue`

**Step 1: Replace the entire `<style scoped>` block**

```css
<style scoped>
.mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--border-subtle);
  z-index: 200;
}
/* 进度条贴顶部 3px 青绿渐变 */
.mini-player::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--gradient-accent);
  width: var(--mini-progress, 0%);
  transition: width 0.3s linear;
}
.mini-player__inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.mini-player__info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
  text-decoration: none;
  color: inherit;
}
.mini-player__cover {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}
.mini-player__text { min-width: 0; }
.mini-player__title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}
.mini-player__artist {
  font-size: 12px;
  color: var(--text-secondary);
}
.mini-player__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-player__btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: color .15s;
}
.mini-player__btn:hover { color: var(--text-primary); }
.mini-player__btn:disabled { opacity: .3; cursor: not-allowed; }
/* 播放按钮圆形青绿渐变 */
.mini-player__btn--main {
  width: 40px;
  height: 40px;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 16px;
  transition: transform .15s, box-shadow .15s;
}
.mini-player__btn--main:hover {
  transform: scale(1.08);
  box-shadow: var(--shadow-glow);
}
.mini-player__progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-player__time {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}
/* 进度条青绿渐变轨道 */
.mini-player__slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.mini-player__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}
.mini-player__volume { width: 80px; }
.mini-player__vol-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.mini-player__vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-secondary);
}
.mini-player__quality {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-card);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  outline: none;
}
.mini-player__quality:focus { border-color: var(--accent); }
.mini-player__quality option { background: var(--bg-card); color: var(--text-primary); }

/* 响应式 */
@media (max-width: 768px) {
  .mini-player__inner { padding: 0 12px; gap: 12px; }
  .mini-player__info { min-width: 120px; }
  .mini-player__volume { display: none; }
  .mini-player__quality { display: none; }
  .mini-player__time { display: none; }
}
</style>
```

**Step 2: Add progress bar CSS variable binding in template**

Add a `:style` binding to `.mini-player` div to drive the `::before` progress bar width:

Change the template `<div>` from:
```html
<div v-if="store.currentTrack" class="mini-player">
```
to:
```html
<div v-if="store.currentTrack" class="mini-player" :style="{ '--mini-progress': progressPercent }">
```

And add `progressPercent` computed in `<script setup>`:

```ts
const progressPercent = computed(() => {
  if (!store.duration || store.duration === 0) return '0%';
  return `${(store.progress / store.duration) * 100}%`;
});
```

**Step 3: Commit**

```bash
git add apps/web/src/components/MiniPlayer.vue
git commit -m "feat(ui): MiniPlayer 毛玻璃播放器 + 青绿进度条"
```

---

### Task 4: TrackList.vue — Dark List with Equalizer Animation

**Files:**
- Modify: `apps/web/src/components/TrackList.vue`

**Step 1: Replace the entire `<style scoped>` block**

```css
<style scoped>
.track-list {
  display: flex;
  flex-direction: column;
}
.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background .15s;
  position: relative;
}
.track-item:hover { background: var(--bg-hover); }
/* 当前播放行左侧 2px 青绿竖线 + 微弱青绿背景 */
.track-item--active {
  background: var(--accent-glow);
}
.track-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--gradient-accent);
  border-radius: 1px;
}
.track-item__index {
  width: 28px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}
/* 当前播放行：均衡器图标替换序号 */
.track-item--active .track-item__index {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: transparent;
  position: relative;
}
.track-item--active .track-item__index::before,
.track-item--active .track-item__index::after {
  content: '';
  display: block;
  width: 3px;
  background: var(--accent);
  border-radius: 1px;
  animation: eq-bar 0.8s ease-in-out infinite alternate;
}
.track-item--active .track-item__index::before {
  height: 12px;
  animation-delay: 0s;
}
.track-item--active .track-item__index::after {
  height: 8px;
  animation-delay: 0.3s;
}
@keyframes eq-bar {
  0% { transform: scaleY(0.3); }
  100% { transform: scaleY(1); }
}

.track-item__link {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}
.track-item__cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-elevated);
}
.track-item__cover--placeholder {
  background: var(--bg-hover);
}
.track-item__info {
  flex: 1;
  min-width: 0;
}
.track-item__title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}
.track-item--active .track-item__title { color: var(--accent); }
.track-item__artist {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-item__duration {
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.track-item__play {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  flex-shrink: 0;
}
.track-item:hover .track-item__play { opacity: 1; }
.track-item__play:hover { transform: scale(1.1); box-shadow: var(--shadow-glow); }

@media (max-width: 768px) {
  .track-item__index { display: none; }
  .track-item__duration { display: none; }
  .track-item__play { opacity: 1; }
  .track-item { gap: 10px; padding: 8px 8px; }
}
</style>
```

**Step 2: Commit**

```bash
git add apps/web/src/components/TrackList.vue
git commit -m "feat(ui): TrackList 暗黑列表 + 均衡器动画 + 青绿激活态"
```

---

### Task 5: ErrorState.vue — Dark Error State with SVG Icons

**Files:**
- Modify: `apps/web/src/components/ErrorState.vue`

**Step 1: Replace the emoji `icon` computed with SVG inline icons**

Replace the template `<p class="error-state__icon">{{ icon }}</p>` with:

```html
<div class="error-state__icon" v-html="iconSvg"></div>
```

Replace the `icon` computed in `<script setup>` with `iconSvg`:

```ts
const iconSvg = computed(() => {
  const stroke = 'currentColor';
  switch (props.code) {
    case 401: case 403:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 402:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
    case 404:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    case 429:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    default:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  }
});
```

**Step 2: Replace the entire `<style scoped>` block**

```css
<style scoped>
.error-state {
  text-align: center;
  padding: 64px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
}
.error-state__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}
.error-state__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.error-state__detail {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
.error-state__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.error-state__btn {
  height: 36px;
  padding: 0 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: opacity .15s;
}
.error-state__btn:hover { opacity: 0.85; }
/* 幽灵按钮：青绿渐变边框 */
.error-state__btn--ghost {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--border-active);
}
.error-state__btn--ghost:hover { background: var(--accent-glow); }
</style>
```

**Step 3: Commit**

```bash
git add apps/web/src/components/ErrorState.vue
git commit -m "feat(ui): ErrorState 暗黑错误状态 + SVG 线条图标 + 幽灵按钮"
```

---

## Phase 3: Page Views

### Task 6: HomeView.vue — Hero Section + Dark Card Grid

**Files:**
- Modify: `apps/web/src/views/HomeView.vue`

**Step 1: Add Hero section to template**

Replace the template with:

```html
<template>
  <div class="home-view">
    <!-- 加载骨架屏 -->
    <div v-if="loading" class="home-view__skeleton">
      <!-- Hero 骨架 -->
      <div class="hero hero--skeleton">
        <div class="hero__bg-skeleton" />
      </div>
      <div class="chart-grid">
        <div v-for="i in 8" :key="i" class="chart-card chart-card--skeleton">
          <div class="chart-card__cover-skeleton" />
          <div class="chart-card__name-skeleton" />
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <ErrorState
      v-else-if="error"
      :message="errorMsg"
      :code="errorCode"
      @retry="fetchCharts"
    />

    <!-- 空状态 -->
    <div v-else-if="charts.length === 0" class="home-view__empty">
      <p>暂无榜单数据</p>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- Hero 区域 -->
      <router-link
        v-if="charts[0]"
        :to="`/chart/${charts[0].platform}/${charts[0].id}`"
        class="hero"
      >
        <img
          v-if="charts[0].cover"
          :src="charts[0].cover"
          class="hero__bg"
          @error="onImgError"
        />
        <div class="hero__overlay" />
        <div class="hero__content">
          <h2 class="hero__title">{{ charts[0].name }}</h2>
          <p class="hero__meta">{{ charts[0].platform }} · 热门榜单</p>
          <span class="hero__btn">查看榜单</span>
        </div>
      </router-link>

      <!-- 分区标题 -->
      <div class="section-header">
        <div class="section-header__title">
          <span class="section-header__line" />
          <h3>热门榜单</h3>
        </div>
      </div>

      <!-- 榜单网格 -->
      <div class="chart-grid">
        <router-link
          v-for="chart in charts"
          :key="chart.id"
          :to="`/chart/${chart.platform}/${chart.id}`"
          class="chart-card"
        >
          <div class="chart-card__cover-wrap">
            <img
              :src="chart.cover"
              :alt="chart.name"
              class="chart-card__cover"
              loading="lazy"
              @error="onImgError"
            />
          </div>
          <p class="chart-card__name">{{ chart.name }}</p>
        </router-link>
      </div>
    </template>
  </div>
</template>
```

**Step 2: Replace the entire `<style scoped>` block**

```css
<style scoped>
/* Hero 区域 */
.hero {
  position: relative;
  height: 360px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  margin-bottom: 40px;
  text-decoration: none;
  color: inherit;
}
.hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(2px) brightness(0.4);
}
.hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(5,5,8,0.9) 0%, transparent 60%);
}
.hero__content {
  position: relative;
  z-index: 1;
  padding: 40px;
}
.hero__title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.hero__meta {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-transform: capitalize;
}
.hero__btn {
  display: inline-block;
  padding: 10px 24px;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-weight: 600;
  font-size: 14px;
  border-radius: var(--radius-sm);
  transition: opacity .15s;
}
.hero:hover .hero__btn { opacity: 0.85; }

/* Hero 骨架 */
.hero--skeleton {
  background: var(--bg-card);
  margin-bottom: 40px;
}
.hero__bg-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* 分区标题 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.section-header__title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-header__line {
  width: 4px;
  height: 20px;
  background: var(--gradient-accent);
  border-radius: 2px;
}
.section-header__title h3 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* 卡片网格 */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}
.chart-card {
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  transition: transform .3s, box-shadow .3s, border-color .3s;
}
.chart-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-glow);
  border-color: var(--border-active);
}
.chart-card__cover-wrap {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--bg-elevated);
}
.chart-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .3s;
}
.chart-card:hover .chart-card__cover {
  transform: scale(1.05);
}
.chart-card__name {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 骨架屏 */
.chart-card--skeleton { pointer-events: none; }
.chart-card__cover-skeleton {
  aspect-ratio: 1;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.chart-card__name-skeleton {
  margin: 10px 12px;
  height: 16px;
  width: 70%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.home-view__empty {
  text-align: center;
  padding: 64px 0;
  color: var(--text-secondary);
}

/* 响应式 */
@media (max-width: 768px) {
  .hero { height: 260px; }
  .hero__content { padding: 24px; }
  .hero__title { font-size: 24px; }
  .chart-grid { gap: 16px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
}
</style>
```

**Step 3: Commit**

```bash
git add apps/web/src/views/HomeView.vue
git commit -m "feat(ui): HomeView Hero 区域 + 暗黑卡片瀑布流 + 分区标题"
```

---

### Task 7: PlayerView.vue — Immersive Full-Screen Dark Theme

**Files:**
- Modify: `apps/web/src/views/PlayerView.vue`

**Step 1: Replace the entire `<style scoped>` block**

This is the largest file. Replace all styles with the dark immersive theme:

```css
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
```

**Step 2: Commit**

```bash
git add apps/web/src/views/PlayerView.vue
git commit -m "feat(ui): PlayerView 暗黑沉浸式详情页 + 青绿歌词高亮"
```

---

### Task 8: SearchView.vue — Dark Search with Glassmorphism

**Files:**
- Modify: `apps/web/src/views/SearchView.vue`

**Step 1: Replace the entire `<style scoped>` block**

```css
<style scoped>
.search-view__bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
/* 搜索框毛玻璃背景 */
.search-view__input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 15px;
  outline: none;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: border-color .15s, box-shadow .15s;
}
.search-view__input::placeholder { color: var(--text-muted); }
/* 焦点时青绿边框 */
.search-view__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
/* 按钮青绿渐变填充 */
.search-view__btn {
  height: 44px;
  padding: 0 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-accent);
  color: var(--bg-deep);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.search-view__btn:hover { opacity: 0.85; }
.search-view__btn:disabled { opacity: .4; cursor: not-allowed; }
.search-view__more {
  text-align: center;
  padding: 24px 0;
}
.search-view__more-btn {
  padding: 10px 32px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: background .15s, border-color .15s;
}
.search-view__more-btn:hover { background: var(--bg-hover); border-color: var(--border-active); }
.search-view__more-btn:disabled { opacity: .4; cursor: not-allowed; }
.search-view__no-more { color: var(--text-muted); font-size: 14px; }
.search-view__empty,
.search-view__loading {
  text-align: center;
  padding: 64px 0;
  color: var(--text-secondary);
}
</style>
```

**Step 2: Commit**

```bash
git add apps/web/src/views/SearchView.vue
git commit -m "feat(ui): SearchView 暗黑搜索 + 毛玻璃输入框 + 青绿按钮"
```

---

### Task 9: ChartView.vue — Dark Adaptation

**Files:**
- Modify: `apps/web/src/views/ChartView.vue`

**Step 1: Replace the entire `<style scoped>` block**

```css
<style scoped>
.chart-view__header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}
.chart-view__cover {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}
.chart-view__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.chart-view__meta h2 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.chart-view__desc {
  font-size: 14px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.chart-view__count {
  font-size: 13px;
  color: var(--text-muted);
}
.chart-view__loading {
  text-align: center;
  padding: 64px 0;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .chart-view__header { gap: 16px; }
  .chart-view__cover { width: 120px; height: 120px; }
  .chart-view__meta h2 { font-size: 18px; }
}
</style>
```

**Step 2: Commit**

```bash
git add apps/web/src/views/ChartView.vue
git commit -m "feat(ui): ChartView 暗黑适配"
```

---

### Task 10: PlaylistView.vue — Dark Adaptation

**Files:**
- Modify: `apps/web/src/views/PlaylistView.vue`

**Step 1: Replace the entire `<style scoped>` block**

```css
<style scoped>
.playlist-view__header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}
.playlist-view__cover {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-md);
  object-fit: cover;
}
.playlist-view__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.playlist-view__meta h2 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.playlist-view__desc {
  font-size: 14px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.playlist-view__count { font-size: 13px; color: var(--text-muted); }
.playlist-view__loading {
  text-align: center;
  padding: 64px 0;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .playlist-view__header { gap: 16px; }
  .playlist-view__cover { width: 120px; height: 120px; }
  .playlist-view__meta h2 { font-size: 18px; }
}
</style>
```

**Step 2: Commit**

```bash
git add apps/web/src/views/PlaylistView.vue
git commit -m "feat(ui): PlaylistView 暗黑适配"
```

---

## Final Verification

### Task 11: Build Verification & Visual Check

**Step 1:** Run `cd apps/web && npx vite build` to verify no compilation errors.

**Step 2:** Run `cd apps/web && npx vite --host` to start dev server and visually verify all 6 pages.

**Step 3:** Final commit (if any hot-fixes needed).

---

## Summary

| Task | File | Key Changes |
|------|------|-------------|
| 1 | App.vue | CSS 变量系统 + 暗黑背景 + Inter 字体 |
| 2 | TopBar.vue | 毛玻璃 + 青绿 Logo + 底部导航线 |
| 3 | MiniPlayer.vue | 毛玻璃 + 顶部进度条 + 青绿播放按钮 |
| 4 | TrackList.vue | 暗黑列表 + 均衡器动画 + 青绿竖线 |
| 5 | ErrorState.vue | SVG 图标 + 暗黑卡片 + 幽灵按钮 |
| 6 | HomeView.vue | Hero 区域 + 分区标题 + 暗黑卡片悬浮 glow |
| 7 | PlayerView.vue | 暗黑沉浸 + 青绿歌词 glow + 渐变控件 |
| 8 | SearchView.vue | 毛玻璃搜索框 + 青绿焦点 + 渐变按钮 |
| 9 | ChartView.vue | CSS 变量暗黑适配 |
| 10 | PlaylistView.vue | CSS 变量暗黑适配 |
