# Music-Lemon 🎵🍋

基于 TuneHub V3 API 构建的现代化、沉浸式桌面端优先可视化音乐发现与播放网站。提供清爽极简的暗黑主题视觉体验，一站式覆盖音乐搜索、榜单、歌单与音乐解析播放功能。

---

## ✨ 核心特性

- **🌐 多平台聚合与无缝切换**
  - 深度集成 TuneHub V3 接口，支持网易云、QQ 音乐等主流平台。
  - 前端适配器层 (Adapter Layer) 实现异构数据结构的标准化归一化，切换平台无需重载页面。

- **🎨 沉浸式暗黑主题 (Dark Theme Redesign)**
  - 全新重构的 UI 系统，采用极致毛玻璃 (Glassmorphism) 效果。
  - 引入青绿荧光色调 (`#00e6b3`) 作为系统级交互的强调色 (Accent Color)。
  - `PlayerView` (播放详情页) 支持高斯模糊动态背景与平滑过度动画，提供剧院级视觉享受。

- **🎵 全功能发现与播放体系**
  - **榜单 (Chart)**：实时拉取各平台原生音源榜单，支持分类浏览。
  - **搜索 (Search)**：支持跨平台的单曲全局搜索。
  - **歌单 (Playlist)**：精选歌单详情页聚合展示与一键播放。
  - **动态播放 (Player)**：内置 `MiniPlayer` (迷你播放条) 与全屏沉浸播放，支持播放控制、进度调节、音量控制。

- **⚡ 高性能渐进式解析层**
  - **Node.js 代理层**：内置 `NodeCache` 进程内 LRU 缓存系统，极大减少对上游 API 的重复请求，降低延迟。
  - **动态降级策略**：当请求高质量音质超时或失败时，支持透明回退与解析展示，保障播放连续性。
  - **API Key 保护**：通过后端 Express 中间件隐藏与注入 `TUNEHUB_API_KEY`，前端对密钥零感知。

---

## 🏗️ 架构与技术栈

项目基于 `npm workspaces` 组织为标准的 Monorepo 架构，前后端分离。

### 🎨 前端 (`apps/web`)
- **核心框架**：[Vue 3](https://vuejs.org/) (Composition API / `<script setup>`)
- **构建工具**：[Vite](https://vitejs.dev/) (极速冷启动与 HMR)
- **状态管理**：[Pinia](https://pinia.vuejs.org/) (强类型状态树，管理播放队列与当前状态)
- **路由管理**：[Vue Router 4](https://router.vuejs.org/)
- **网络请求**：原生 `fetch` 封装 ApiClient
- **样式方案**：原生 CSS3 (CSS Variables 系统 + BEM 命名规范)，零预处理器依赖，纯 CSS 实现骨架屏与毛玻璃等高级动效。

### ⚙️ 后端代理 (`apps/server`)
- **运行时环境**：Node.js
- **Web 框架**：[Express 4](https://expressjs.com/)
- **核心中间件**：
  - `cors`: 处理前端跨域请求
  - `express.json()`: 解析请求体
- **缓存策略**：使用 `node-cache` 实现基于 TTL 的轻量级内存缓存
- **测试框架**：[Vitest](https://vitest.dev/) (提供接口级单元测试)

---

## 🚀 快速开始

### 1. 环境准备

确保您的开发环境已安装：
- [Node.js](https://nodejs.org/) (推荐 `>= 20.0.0`)
- npm (Node.js 自带)

### 2. 克隆与安装依赖

```bash
git clone <repository-url>
cd TuneHub
# 依赖安装会自动处理 monorepo 下的所有子包
npm install
```

### 3. 环境变量配置

#### 服务端配置 (`apps/server/.env`)
在 `apps/server` 目录下创建 `.env` 文件，填入所需的环境变量：

```env
# Server Port
PORT=3000

# TuneHub API 凭证
TUNEHUB_API_KEY=your_tunehub_api_key_here
TUNEHUB_BASE_URL=https://tunehub.sayqz.com/api

# 缓存配置 (可选)
CACHE_TTL_S=86400       # 缓存时间(秒)，默认 24 小时
CACHE_MAX_ITEMS=500     # 最大缓存条目数

# CORS 配置 (限制允许跨域的源)
CORS_ORIGIN=http://localhost:5173
```
> **注**：`TUNEHUB_BASE_URL` 默认已配置为官方上游 `https://tunehub.sayqz.com/api`。

#### 前端配置 (`apps/web/.env.development`)
在 `apps/web` 目录下创建 `.env.development`：

```env
# 指向本地开发的后端代理服务
VITE_API_BASE_URL=http://localhost:3000
```

### 4. 启动开发服务器

在项目根目录下，执行以下命令即可同时启动前后端开发服务器（借助于 monorepo 脚本）：

```bash
# 自动并行启动前端页面 (http://localhost:5173) 和后端接口代理 (http://localhost:3000)
npm run dev
```

### 5. 构建生产版本

```bash
# 编译并打包前后端代码
npm run build
```
构建产物将分别输出在 `apps/web/dist` 和 `apps/server/dist`。

---

## 🗺️ 目录结构说明

```text
├── apps/
│   ├── server/                   # Express 后端代理层
│   │   ├── src/                  # 核心逻辑
│   │   │   ├── routes/           # 路由控制器 (parse, health, detail, download, methods等)
│   │   │   ├── cache.ts          # LRU 缓存单例
│   │   │   ├── config.ts         # 环境变量解析与验证
│   │   │   ├── errors.ts         # 全局异常处理机制
│   │   │   ├── upstream.ts       # 封装对 tunehub.sayqz.com 的请求代理
│   │   │   └── app.ts / index.ts # Express 实例挂载与服务启动
│   │   └── tests/                # 针对各路由模块的 Vitest 单元测试
│   │
│   └── web/                      # Vue 3 前端应用
│       ├── src/
│       │   ├── adapters/         # 数据归一化适配器层 (屏蔽不同平台的字段差异)
│       │   ├── api/              # 对接本地 proxy server 的 HTTP Client 封装
│       │   ├── components/       # 可复用组件 (TopBar, MiniPlayer, TrackList, ErrorState)
│       │   ├── composables/      # Vue 组合式函数 (如 usePlatform)
│       │   ├── router/           # Vue Router 路由配置
│       │   ├── stores/           # Pinia 状态管理 (player.ts - 核心播放控制逻辑)
│       │   ├── types/            # TypeScript 类型定义 (Track, SearchResult 等)
│       │   └── views/            # 页面级组件 (Home, Player, Search, Chart, Playlist)
│       └── vite.config.ts        # Vite 打包配置
│
├── docs/                         # 项目文档与设计方案
│   ├── plans/                    # 实施计划与步骤追踪
│   └── superpowers/              # 前期架构设计、API 规范与需求规格说明书
├── package.json                  # 根项目 Monorepo 配置
└── .gitignore                    # Git 忽略配置
```

---

## 🔌 API 交互流程简述

本项目的核心设计理念是将敏感的 `API_KEY` 保护在服务端，同时由服务端承担数据缓存和跨域转发的职责：

1. **发起请求**：用户在前端 (`web`) 触发搜索/播放等操作，前端调用自身的统一 API Client (`http://localhost:3000/api/v1/xxx`)。
2. **代理拦截**：请求到达本地后端代理 (`server`)。
3. **缓存命中**：后端检查 LRU 缓存。若命中，则直接返回，降低延迟。
4. **鉴权与转发**：若未命中缓存，代理层读取环境变量 `TUNEHUB_API_KEY`，将其注入请求头，并转发至真正的上游服务 (`https://tunehub.sayqz.com/api/v1/xxx`)。
5. **数据返回**：上游返回数据后，代理层将其缓存并透传给前端。
6. **归一化渲染**：前端 `adapters` 模块将各平台参差不齐的数据结构格式化为统一的 `Track` 或 `Playlist` 接口对象，交由 Vue 组件渲染。

---

## 📜 许可证

本项目遵循 MIT 许可证。详见 LICENSE 文件。
