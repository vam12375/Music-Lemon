# 多选下载功能设计

> 日期：2026-03-15
> 状态：已批准

## 需求概述

在所有展示 TrackList 的页面（搜索、榜单、歌单、最近播放）支持多选歌曲批量下载。

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 触发场景 | 所有页面统一支持 | TrackList 是共用组件，改一处全生效 |
| 交互方式 | 工具栏按钮触发多选模式 | 最直观明确 |
| 音质策略 | 复用 player.quality 全局设置 | 无需额外 UI |
| 执行策略 | 并发控制（concurrency=2） | 速度与稳定性平衡 |
| 进度展示 | 底部浮动面板 | 不遮挡列表且信息充分 |
| 架构方式 | 独立 Download Store | SRP，与 player store 解耦 |

---

## 架构设计

### 数据流

```
TrackList.vue（多选 UI）
    ↓ selectedIds（v-model）
SelectToolbar.vue（工具栏：全选/下载/取消）
    ↓ startDownload()
stores/download.ts（独立 Pinia store）
    ├── 选中项管理（isSelectMode / selectedIds）
    ├── 下载队列 + 并发控制（concurrency=2）
    ├── 逐首 parse → 获取 URL → 触发浏览器下载
    └── 任务状态（queued/parsing/downloading/done/error）
        ↓
DownloadPanel.vue（底部浮动进度面板，挂载在 App.vue）
```

---

## 组件设计

### 1. TrackList.vue 改造

新增 Props：

```typescript
defineProps<{
  tracks: Track[];
  playingId?: string;
  selectable?: boolean;       // 是否处于多选模式
  selectedIds?: Set<string>;  // 已选中的 track.id 集合
}>();

defineEmits<{
  view: [track: Track, index: number];
  play: [track: Track, index: number];
  'update:selectedIds': [ids: Set<string>];
}>();
```

多选模式下的 UI 变化：
- 序号列 → 复选框
- 播放按钮隐藏
- 点击整行 → 切换选中状态
- 选中行高亮背景

TrackList 本身无状态，仅通过 props/emit 双向绑定。

### 2. SelectToolbar.vue（新组件）

```
非多选模式:  [批量操作]
多选模式:    [☐ 全选]  已选 N 首    [📥 下载]  [✕ 取消]
```

- 各 View 页面引入，放置在 TrackList 上方
- 下载按钮仅在 selectedIds.size > 0 时可点击

### 3. DownloadPanel.vue（新组件）

挂载在 App.vue，与 MiniPlayer 同层级（位于其上方）：

```
┌─────────────────────────────────────────────────┐
│  📥 下载进度  3/10 完成              [▼ 收起]   │
├─────────────────────────────────────────────────┤
│  ✅ 小半 - 陈粒                          done   │
│  ⏳ 虚拟 - 陈粒                       parsing   │
│  ⏳ 空空 - 陈粒                    downloading   │
│  ⏸ 短歌 - 陈粒                        queued   │
│  ❌ 易燃易爆炸 - 陈粒              解析失败     │
├─────────────────────────────────────────────────┤
│              [清除已完成]                        │
└─────────────────────────────────────────────────┘
```

- 有任务时自动弹出，可收起/展开
- 全部完成后不自动关闭

---

## Store 设计

### stores/download.ts

```typescript
interface DownloadTask {
  track: Track;
  status: 'queued' | 'parsing' | 'downloading' | 'done' | 'error';
  error?: string;
  url?: string;
  filename?: string;
}

// State
{
  tasks: Map<string, DownloadTask>;  // key = track.id
  concurrency: 2;
  isSelectMode: boolean;
  selectedIds: Set<string>;
}
```

核心 Actions：

| Action | 说明 |
|--------|------|
| `enterSelectMode()` | 进入多选模式 |
| `exitSelectMode()` | 退出并清空选中 |
| `toggleSelect(id)` | 切换单首选中 |
| `selectAll(tracks)` | 全选 |
| `deselectAll()` | 取消全选 |
| `startDownload()` | 选中项入队，启动下载引擎 |
| `processQueue()` | 并发控制器：维持 ≤2 个并行任务 |
| `downloadOne(task)` | parse → URL → 触发浏览器下载 |
| `clearCompleted()` | 清理已完成任务 |

### 单首下载流程

```
1. status → 'parsing'
2. 调用 parse API（音质取自 playerStore.quality）
3. 成功 → url = result.url, status → 'downloading'
4. 构建 /api/download?url=...&filename=...
5. 创建隐藏 <a download> 触发浏览器下载
6. status → 'done'
   失败 → status → 'error', error = 原因
7. processQueue() 启动下一个
```

### 并发控制

```
active = tasks 中 parsing/downloading 的数量
while (active < concurrency) {
  next = 第一个 queued 任务
  if (!next) break
  downloadOne(next)  // 不 await
  active++
}
```

---

## 涉及文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `stores/download.ts` | 新增 | 下载状态管理 + 并发引擎 |
| `components/SelectToolbar.vue` | 新增 | 批量操作工具栏 |
| `components/DownloadPanel.vue` | 新增 | 底部下载进度面板 |
| `components/TrackList.vue` | 修改 | 新增多选模式支持 |
| `views/SearchView.vue` | 修改 | 引入 SelectToolbar |
| `views/ChartView.vue` | 修改 | 引入 SelectToolbar |
| `views/PlaylistView.vue` | 修改 | 引入 SelectToolbar |
| `views/RecentView.vue` | 修改 | 引入 SelectToolbar |
| `App.vue` | 修改 | 挂载 DownloadPanel |
