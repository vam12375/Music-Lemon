# TuneHub 可视化音乐发现网站 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按规格实现包含前后端与代理的可视化音乐发现网站（榜单为主入口、搜索/歌单/解析/同步歌词）。

**Architecture:** 单仓库、前端 `Vue3+Vite` 与后端 `Express` 分目录。后端负责鉴权、方法下发与解析降级；前端负责数据归一化、页面与播放器体验。

**Tech Stack:** Node.js 18+、TypeScript、Express、Vite、Vue 3、Pinia、Vitest、Supertest、lru-cache。

---

## Chunk 1: 仓库结构与后端基础

**文件结构（规划）：**
1. `package.json`：根工作区与统一脚本
2. `.gitignore`：忽略依赖/构建/环境变量/日志/brainstorm 产物
3. `apps/server/package.json`：后端依赖与脚本
4. `apps/server/tsconfig.json`：后端 TS 配置（开发/测试）
5. `apps/server/tsconfig.build.json`：后端构建配置
6. `apps/server/vitest.config.ts`：后端测试配置
7. `apps/server/src/index.ts`：启动入口
8. `apps/server/src/app.ts`：Express app 工厂（便于测试）
9. `apps/server/src/routes/health.ts`：健康检查
10. `apps/server/tests/health.test.ts`：健康检查测试

### Task 1: 初始化工作区结构与根配置

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `apps/server/`
- Create: `apps/web/`

- [ ] **Step 1: 创建目录结构**

```powershell
New-Item -ItemType Directory -Force -Path apps/server | Out-Null
New-Item -ItemType Directory -Force -Path apps/web | Out-Null
```

- [ ] **Step 2: 写入根 `package.json`（工作区 + 统一脚本）**

```json
{
  "name": "tunehub-visual-site",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:server": "npm -w apps/server run dev",
    "dev:web": "npm -w apps/web run dev",
    "test:server": "npm -w apps/server run test",
    "test:web": "npm -w apps/web run test"
  }
}
```

- [ ] **Step 3: 写入 `.gitignore`**

```
node_modules/
dist/
.env
.env.*
*.log
.superpowers/
```

- [ ] **Step 4: 若是 Git 仓库则提交**

```bash
git add package.json .gitignore

git commit -m "chore: init workspace skeleton"
```

Expected: 若不是 Git 仓库则跳过此步。

### Task 2: 搭建后端包与测试运行器

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/tsconfig.build.json`
- Create: `apps/server/vitest.config.ts`

- [ ] **Step 1: 创建 `apps/server/package.json`**

```json
{
  "name": "tunehub-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run --reporter=basic"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "lru-cache": "^11.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.30",
    "@types/supertest": "^2.0.16",
    "supertest": "^6.3.4",
    "tsx": "^4.7.1",
    "typescript": "^5.4.3",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: 创建 `apps/server/tsconfig.json`（开发/测试）**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: 创建 `apps/server/tsconfig.build.json`（仅构建 src）**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "noEmit": false
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 `apps/server/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 60000
  }
});
```

- [ ] **Step 5: 安装依赖（仓库根目录执行）**

```bash
npm install
```

Expected: 安装 workspaces 依赖完成。

- [ ] **Step 6: 若是 Git 仓库则提交**

```bash
git add apps/server/package.json apps/server/tsconfig.json apps/server/tsconfig.build.json apps/server/vitest.config.ts

git commit -m "chore: setup server package and vitest"
```

Expected: 若不是 Git 仓库则跳过此步。

### Task 3: 健康检查接口（TDD）

**Files:**
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/routes/health.ts`
- Create: `apps/server/tests/health.test.ts`

- [ ] **Step 1: 创建测试目录**

```powershell
New-Item -ItemType Directory -Force -Path apps/server/tests | Out-Null
```

- [ ] **Step 2: 编写失败测试 `apps/server/tests/health.test.ts`**

```ts
import request from "supertest";
import { createApp } from "../src/app";

it("GET /api/health returns ok", async () => {
  const app = createApp();
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ code: 0, message: "ok" });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm -w apps/server run test -- health.test.ts`

Expected: FAIL，提示 `createApp` 或路由不存在。

- [ ] **Step 4: 创建源码目录**

```powershell
New-Item -ItemType Directory -Force -Path apps/server/src/routes | Out-Null
```

- [ ] **Step 5: 实现最小可运行服务（app/index/router）**

`apps/server/src/app.ts`
```ts
import express from "express";
import { healthRouter } from "./routes/health";

export function createApp() {
  const app = express();
  app.use("/api/health", healthRouter);
  return app;
}
```

`apps/server/src/routes/health.ts`
```ts
import { Router } from "express";

export const healthRouter = Router();
healthRouter.get("/", (_req, res) => {
  res.json({ code: 0, message: "ok" });
});
```

`apps/server/src/index.ts`
```ts
import { createApp } from "./app";

const port = Number(process.env.PORT || 3000);
createApp().listen(port, () => {
  console.log(`server listening on ${port}`);
});
```

- [ ] **Step 6: 重新运行测试确认通过**

Run: `npm -w apps/server run test -- health.test.ts`

Expected: PASS

- [ ] **Step 7: 若是 Git 仓库则提交**

```bash
git add apps/server/src apps/server/tests

git commit -m "feat: add health endpoint"
```

Expected: 若不是 Git 仓库则跳过此步。
