# TuneHub UI 重构设计文档 — 暗黑主题

> 日期: 2026-03-13
> 范围: 纯UI重构，功能保持不变
> 风格: 暗黑主题 + 青绿荧光强调色 + 沉浸式设计

## 设计决策

| 维度 | 选择 |
|------|------|
| 色调 | 暗黑主题 (深色背景 + 霓虹强调色) |
| 强调色 | 青绿荧光 (#06D6A0 → #00F5D4) |
| 首页布局 | Hero + 分区卡片瀑布流 |
| 详情页 | 沉浸全屏 (封面模糊背景 + 信息叠加) |
| 动效 | 中等 (CSS + Vue transition, 无新依赖) |

---

## 1. 设计系统

### 色彩系统

```css
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
```

### 排版

```
字体栈: "Inter", "Noto Sans SC", system-ui, sans-serif
标题: font-weight: 700, letter-spacing: -0.02em
正文: font-weight: 400
```

### 圆角 & 阴影

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--shadow-card: 0 4px 24px rgba(0,0,0,0.4);
--shadow-glow: 0 0 20px var(--accent-glow);
```

---

## 2. 首页（发现页）

- **Hero 区域** (360px): 第一个榜单的封面做模糊背景，叠加榜单名称、歌曲数、"查看榜单"按钮
- **分区卡片**: 按平台分组（网易云、QQ、酷我），每行4-5个卡片
- **卡片设计**: bg-card 背景, 12px 圆角, 悬浮时 translateY(-6px) + glow 阴影 + accent 边框
- **分区标题**: 左侧标题 + 青绿装饰线, 右侧"查看全部"链接
- **骨架屏**: 暗色 shimmer (rgba 白色微弱渐变)

---

## 3. 歌曲详情页 (PlayerView)

- **背景**: 封面图 blur(60px) + brightness(0.2) + 深色遮罩
- **歌曲信息**: 居中布局, 封面180px + 歌曲名28px + 歌手/专辑/标签
- **播放控制**: 居中, 进度条青绿渐变轨道, 播放按钮56px圆形青绿渐变
- **歌词面板**: 当前行18px+bold+accent+glow, 前后行渐变透明, max-height 300px 滚动
- **解析工具区**: 折叠面板, 默认收起, 内部暗黑风格输入框和结果展示

---

## 4. 通用组件

### TopBar
- 毛玻璃效果: backdrop-filter: blur(20px), rgba(10,10,15,0.8)
- Logo 青绿渐变文字
- 导航选中态底部2px青绿线
- 平台切换胶囊按钮组

### MiniPlayer
- 毛玻璃效果同 TopBar
- 进度条贴顶部 3px 青绿渐变
- 播放按钮圆形青绿渐变边框

### TrackList
- 透明背景, hover 显示 bg-hover
- 当前播放行左侧 2px 青绿竖线 + 微弱青绿背景
- 均衡器图标动画 (CSS @keyframes)

### ErrorState
- 48px SVG 线条图标
- bg-card 背景, 16px 圆角
- 青绿渐变边框幽灵按钮

### SearchView
- 搜索框毛玻璃背景 + 12px 圆角
- 焦点时青绿边框
- 按钮青绿渐变填充

---

## 5. 动效清单

| 元素 | 动效 | 实现 |
|------|------|------|
| 卡片悬浮 | translateY(-6px) + glow | CSS transition 0.3s |
| 页面进入 | opacity 0→1 + translateY(10px→0) | Vue Transition |
| 歌词滚动 | smooth scroll + opacity 淡入淡出 | CSS + JS |
| 播放按钮 | hover scale(1.08) + glow | CSS transition |
| 骨架屏 | shimmer 扫光 | CSS @keyframes |
| 导航高亮 | 底部线条滑入 | CSS transition |
| 均衡器图标 | 3条竖线高度变化 | CSS @keyframes |

---

## 6. 修改文件清单 (仅UI)

1. `App.vue` — 全局CSS变量 + 暗黑背景
2. `HomeView.vue` — Hero区 + 分区卡片
3. `PlayerView.vue` — 沉浸全屏
4. `SearchView.vue` — 搜索框样式
5. `ChartView.vue` — 暗黑适配
6. `PlaylistView.vue` — 暗黑适配
7. `TopBar.vue` — 毛玻璃导航
8. `MiniPlayer.vue` — 毛玻璃播放器
9. `TrackList.vue` — 暗黑列表
10. `ErrorState.vue` — 暗黑错误状态

**不修改**: router, stores, api, adapters, types
