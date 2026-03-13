# TuneHub 可视化音乐发现网站 - 设计说明

日期：2026-03-12

## 背景与目标
本项目基于 TuneHub V3 API，构建一个桌面端优先的“音乐发现与播放”可视化网站。
目标是以榜单为主入口，覆盖搜索、榜单、歌单与歌曲解析播放，提供清爽极简的视觉体验。

## 范围与非目标
范围：
1. 入口：榜单封面墙为主入口
2. 功能：搜索 / 榜单 / 歌单 / ID 解析 / 同步滚动歌词
3. 平台：网易云 + QQ + 酷我
4. 播放器：底部迷你播放器 + 独立播放页
5. 鉴权：仅后端持有 API Key
6. 缓存：后端缓存 5 分钟

非目标：
1. 账号体系（登录/收藏/同步）
2. 复杂的个性化推荐
3. 移动端优先体验
4. 动态扩展方法（首版仅支持 search/toplists/toplist/playlist；`/api/methods*` 仅用于调试）

## 架构与边界
形态：单仓库，前后端同项目但分目录。

目录建议：
1. apps/web：Vue 3 + Vite
2. apps/server：Express 代理

边界：
1. 浏览器仅调用 `/api/*`
2. 代理层负责携带 `X-API-Key` 与上游 TuneHub 通讯
3. 搜索/榜单/歌单的数据归一化在前端完成
4. 播放解析由后端负责质量降级并返回统一 items 结构

## 上游与鉴权
上游 Base URL：`https://tunehub.sayqz.com/api`

鉴权：
1. 请求头 `X-API-Key: <API_KEY>`
2. API Key 仅放在后端环境变量

平台枚举（统一小写）：
1. `netease`
2. `qq`
3. `kuwo`

默认平台选择：
1. 首次进入默认 `netease`
2. 用户切换后写入 `localStorage`，下次进入复用
3. 播放页平台切换控件禁用，不更新 `localStorage`

环境变量建议：
1. `TUNEHUB_API_KEY`
2. `TUNEHUB_BASE_URL`（默认值为上面的 Base URL）
3. `CACHE_TTL_MS=300000`
4. `CACHE_MAX_ITEMS=500`
5. `CORS_ORIGIN`（默认 `http://localhost:5173`）

## 后端代理设计（Express）
对外接口：
1. GET /api/methods
2. GET /api/methods/:platform
3. GET /api/methods/:platform/:function
4. POST /api/exec
5. POST /api/parse

说明：
1. 代理层不执行 transform
2. 代理层只转发与鉴权，并处理 CORS
3. 代理层会在调用上游前进行模板变量替换
4. 仅允许 function：search/toplists/toplist/playlist

统一响应结构：
1. 成功：`{ code: 0, message: "ok", data: <payload> }`
2. 失败：`{ code: <error_code>, message: <msg>, details?: <any> }`

GET /api/methods* 成功响应（data）：
1. 直接透传上游 `data` 字段
2. 不对结构做二次加工
3. 调试用途，不在前端首版流程中使用

POST /api/exec 请求结构：
```
{
  "platform": "netease",
  "function": "search",
  "params": { "keyword": "周杰伦", "page": 1, "pageSize": 30 }
}
```

POST /api/exec 成功响应（data）：
```
{
  "raw": <object|string>,
  "contentType": "application/json; charset=utf-8",
  "platform": "netease",
  "function": "search"
}
```
说明：
1. 若上游响应为 JSON，则 `raw` 为对象
2. 若上游响应为非 JSON，则 `raw` 为字符串
3. `contentType` 取自上游响应头，便于前端适配器判断
4. 前端适配器仅处理 JSON 类型，非 JSON 直接提示“暂不支持解析”

POST /api/parse 请求结构：
```
{
  "platform": "netease",
  "ids": "1974443814,123456",
  "quality": "flac24bit"
}
```

POST /api/parse 成功响应（data）：
```
{
  "items": [
    { "id": "1974443814", "ok": true, "url": "...", "lyric": "...", "platform": "netease", "quality": "flac" },
    { "id": "123456", "ok": false, "message": "no playable url", "platform": "netease", "qualitiesTried": ["flac24bit","flac","320k","128k"] }
  ]
}
```
说明：`items` 顺序与规范化后的 `ids` 一致。

成功与部分失败规则：
1. 业务参数错误（未知平台/方法/质量、ids 非法）返回 400
2. 上游方法配置缺失返回 404
3. 鉴权与上游错误返回 401/403/402/500/502
4. 仅在上游请求成功且返回响应时，HTTP 状态为 200 且 `code=0`
5. 单曲失败以 `ok=false` 体现，不改变整体 `code`

超时与重试：
1. 默认超时 8 秒
2. /api/exec 可重试 1 次（仅当上游请求为 GET）
3. /api/parse 不做网络重试，但允许质量自动降级

错误映射策略（优先级）：
1. 若上游 HTTP 状态为 401/403/429 或 5xx，优先按 HTTP 状态返回
2. 若上游 HTTP 200 但 code 非 0，按 code 规则映射（-2 -> 402, -1 -> 500, 其他 -> 502）

CORS：
1. 默认允许 `CORS_ORIGIN` 指定来源
2. 允许方法：GET/POST/OPTIONS
3. 允许头：Content-Type/X-API-Key
4. 不启用 credentials

## 方法下发执行策略
策略：后端执行上游请求并返回原始数据，前端解析与归一化。

上游方法配置结构（来自 `${TUNEHUB_BASE_URL}/v1/methods/:platform/:function`）：
```
{
  "code": 0,
  "data": {
    "type": "http",
    "method": "GET",
    "url": "http://search.kuwo.cn/r.s",
    "params": { "client": "kt", "all": "{{keyword}}", "pn": "{{page}}", "rn": "{{pageSize}}" },
    "body": {},
    "headers": { "User-Agent": "okhttp/4.9.0" },
    "transform": "function(response) { ... }"
  }
}
```

执行流程：
1. 前端调用 /api/exec 传入平台、方法与模板变量
2. 后端从 /v1/methods/:platform/:function 获取方法配置
3. 后端替换模板变量后请求上游平台
4. 原始响应返回给前端，由前端适配器归一化

序列化与头部规则：
1. GET：仅使用 url + params 组装 query
2. POST：
   - 若 headers 含 Content-Type=application/json，body 以 JSON 发送
   - 若 headers 含 Content-Type=application/x-www-form-urlencoded，body 以表单发送
   - 未指定 Content-Type 时，默认 application/json
3. headers 优先采用上游配置，如需追加仅在不覆盖同名头时添加
4. 若 url 或 headers 中含占位符，按相同变量替换规则处理

模板变量替换规则：
1. 语法：`{{var}}`
2. 白名单变量：
   - search：keyword、page、pageSize
   - toplist：id
   - playlist：id
   - toplists：无
3. 先补默认值后再校验必填参数
4. 缺失必填变量：返回 400（code=400）
5. params 中的值会进行 URL 编码
6. body 中的值按字符串直接替换
7. 若方法配置包含白名单以外的占位符，返回 400
8. params 中出现白名单以外字段：返回 400

默认值（后端统一）：
1. search.page=1
2. search.pageSize=30

## 解析接口对接规则
上游接口：`${TUNEHUB_BASE_URL}/v1/parse`

ids 规范化：
1. 支持字符串或数组
2. 以逗号分隔，去空白
3. 去除空值与重复项（保留首次出现）
4. 最大 50 个
5. 规范化后为空或超过 50：返回 400（code=400）

上游请求形态：
1. 向上游发送 ids 字符串（逗号分隔）
2. 字段名固定为 ids

quality 规则：
1. 可选值：128k / 320k / flac / flac24bit
2. 默认 flac24bit
3. 自动降级顺序：flac24bit -> flac -> 320k -> 128k
4. 若请求 quality 不在可选值内，返回 400（code=400）

自动降级策略：
1. 单曲在当前 quality 无可用 url 时，按顺序尝试下一档
2. 成功即停止，返回实际 quality
3. 所有档位失败则 ok=false

歌词格式规则：
1. 期望 LRC（带时间戳）
2. 若无时间戳或解析失败：`lyrics[]` 置空，`rawLyricText` 保留原文
3. LyricLine.time 不允许为 null

上游响应兼容策略：
1. data 为对象且包含 url：视为单曲结果
2. data 为数组：逐项读取 id/url/lyric
3. data.items 为数组：逐项读取 id/url/lyric
4. 其他结构：记为 ok=false 并附 message=unrecognized response

## 缓存策略（5 分钟）
缓存范围：
1. /api/methods*：按 URL 缓存 5 分钟
2. /api/exec：按 platform + function + params 缓存 5 分钟
3. /api/parse：按 platform + ids + quality 缓存 5 分钟

说明：
1. 使用内存缓存（进程级），服务重启即失效
2. 缓存命中直接返回，不再触发上游请求
3. 超出 CACHE_MAX_ITEMS 时使用 LRU 淘汰

缓存键规范化：
1. platform 与 function 强制小写
2. params 去除 undefined/null，并补齐默认值
3. ids 支持字符串或数组，规范化为“去空白 + 保序”字符串
4. 采用稳定序列化（key 排序）生成缓存键
5. /api/parse 缓存键使用“请求 quality”，不以降级后的实际质量替换

## 方法参数与最小返回字段（前端期望）
方法参数：
1. search：keyword（必填）、page（默认 1）、pageSize（默认 30）
2. toplists：无参数
3. toplist：id（必填）
4. playlist：id（必填）

前端最小字段期望（适配器输出）：
1. Chart：id / name / cover / platform
2. Playlist：id / name / cover / description / platform / tracks[]
3. Track：id / title / artist / cover / duration / platform / sourceId
4. LyricLine：time / text
5. RawLyricText：string | null

字段映射与回退规则：
1. 标题：title / name / songName / songname / SONGNAME
2. 艺术家：artist / author / singer / ar[0].name / ARTIST
3. 封面：
   - 直接字段：cover / picUrl / img / coverImgUrl / pic / web_albumpic_short
   - QQ 专用：用 albummid 生成 `https://y.qq.com/music/photo_new/T002R300x300M000{albummid}.jpg`
4. 时长：duration / dt / interval / DURATION（统一转换为秒）
5. sourceId：按平台规则读取
6. 列表 track 缺少封面时，回退到所属榜单/歌单封面

sourceId 规则（平台优先字段，按顺序兜底）：
1. netease：id -> songId
2. qq：songmid -> id
3. kuwo：rid -> RID -> id

ID 规则：
1. sourceId：平台原始歌曲 ID，用于 /api/parse 的 ids
2. Track.id：前端内部唯一标识，规则为 ${platform}:${sourceId}
3. Chart.id 与 Playlist.id：使用平台原始 id（路由中直接使用）

Chart/Playlist 映射规则：
1. name：name / ListName / title
2. cover：coverImgUrl / pic / picUrl / pic_album
3. description：description / info / desc

解析接口期望：
1. 播放链接 url（必需）
2. 歌词文本 lyric（可为空）
3. quality 默认 flac24bit，且自动降级

## 平台最小响应样例（脱敏/伪数据）
网易云（netease）：
1. search：
```
{ "result": { "songs": [ { "id": 1974443814, "name": "Song", "ar": [{"name":"Artist"}], "al": {"picUrl":"..."}, "dt": 210000 } ] } }
```
2. toplists：
```
{ "list": [ { "id": 3778678, "name": "热歌榜", "coverImgUrl": "..." } ] }
```
3. toplist/playlist：
```
{ "playlist": { "id": 3778678, "name": "热歌榜", "coverImgUrl": "...", "description": "...", "tracks": [ { "id": 1, "name": "Song", "ar": [{"name":"Artist"}], "al": {"picUrl":"..."}, "dt": 210000 } ] } }
```

QQ（qq）：
1. search：
```
{ "data": { "song": { "list": [ { "songmid": "003abc", "songname": "Song", "singer": [{"name":"Artist"}], "interval": 210, "albummid": "001xyz" } ] } } }
```
2. toplists：
```
{ "data": { "topList": [ { "id": 26, "name": "热歌榜", "picUrl": "..." } ] } }
```
3. toplist/playlist：
```
{ "data": { "topinfo": { "ListName": "热歌榜", "pic_album": "...", "info": "..." }, "songlist": [ { "songmid": "003abc", "songname": "Song", "singer": [{"name":"Artist"}], "interval": 210, "albummid": "001xyz" } ] } }
```

酷我（kuwo）：
1. search：
```
{ "abslist": [ { "RID": "123", "SONGNAME": "Song", "ARTIST": "Artist", "DURATION": "210", "web_albumpic_short": "..." } ] }
```
2. toplists：
```
{ "data": [ { "id": "16", "name": "热歌榜", "pic": "..." } ] }
```
3. toplist/playlist：
```
{ "name": "热歌榜", "pic": "...", "musicList": [ { "rid": "123", "name": "Song", "artist": "Artist", "duration": 210, "pic": "..." } ] }
```

## 页面结构与路由
全局布局：
1. 顶部导航：Logo + 发现/榜单 + 搜索 + 歌单 + 平台切换
2. 主内容区：路由切换
3. 底部迷你播放器：常驻

路由结构：
1. / 首页（榜单封面墙）
2. /chart/:platform/:id 榜单详情（输出 Playlist：含 name/cover/description/tracks）
3. /playlist/:platform/:id 歌单详情（输出 Playlist）
4. /search/:platform 搜索页（platform 必填）
5. /player/:platform/:sourceId 播放页（sourceId 为平台原始 ID）

ID 解析入口：
1. 顶部导航提供“ID 解析”入口
2. 进入后显示输入框（platform + sourceId）
3. 提交后跳转到 /player/:platform/:sourceId

播放页直达策略：
1. 首选从列表进入，携带完整 Track 元数据
2. 若直达仅有 sourceId，则显示骨架与占位文案
3. 直达时尝试从当前列表/本地缓存中补全元数据（Pinia store：`trackCache`，key 为 `${platform}:${sourceId}`，TTL 30 分钟，LRU 200）
4. 若补全失败，则仅展示播放器与歌词区

搜索交互与分页策略：
1. 查询参数：kw（可为空）、page、pageSize
2. 采用“加载更多”模式
3. 初始 page=1，点击加载更多时 page++
4. page/pageSize 写入 URL，便于分享与回退
5. kw 为空：展示空态，不触发请求
6. 访问 /search 时重定向到 /search/{currentPlatform}
7. kw 由前端映射为 keyword 用于 /api/exec
8. 无更多结果时：按钮禁用并提示“没有更多了”

平台切换规则：
1. 在首页/榜单/歌单/搜索页：若 id 在新平台不可用，回退首页并提示“平台不匹配”
2. 在播放页：平台切换控件禁用，仅展示当前曲目平台

## 关键模块与输入输出
TopBar：
1. 输入：currentPlatform、currentRoute
2. 输出：onPlatformChange、onSearch、onNavigate

ChartGrid：
1. 输入：charts[]、loading
2. 输出：onSelect(chart)

TrackList：
1. 输入：tracks[]、playingId、loading
2. 输出：onPlay(track)、onOpen(track)

MiniPlayer：
1. 输入：currentTrack、playState、progress、duration、quality
2. 输出：onPlayPause、onSeek、onNext、onPrev、onQualityChange

PlayerView：
1. 输入：currentTrack、playState、lyrics[]、rawLyricText、quality
2. 输出：onPlayPause、onSeek、onToggleLyric、onQualityChange

LyricPanel：
1. 输入：lyrics[]、currentTime、isActive、rawLyricText
2. 输出：onSeek(time)

## 状态管理与播放器状态机
Pinia 全局状态：
1. currentTrack
2. queue
3. playState：idle | loading | playing | paused | buffering | error
4. progress / duration / volume
5. lyrics[]
6. rawLyricText
7. quality（当前音质）
8. trackCache（LRU 200, TTL 30 分钟）

时间单位：
1. progress/duration 使用秒（float）
2. LyricLine.time 使用秒（float）
3. 解析 LRC 时将 mm:ss.xx 转为秒

Track.duration：
1. 前端统一存秒（float）
2. 若原始字段为毫秒（如 dt），则除以 1000

队列规则：
1. 从任意列表播放：队列替换为该列表顺序，并从当前曲目开始
2. onNext：播放队列下一首，若无则进入 idle
3. onPrev：回到上一首，若无则重新播放当前首

状态事件：
1. load(track) -> loading
2. canplay -> playing
3. pause -> paused
4. waiting -> buffering
5. ended 且有下一首 -> loading 并切到下一首
6. ended 且无下一首 -> idle
7. error -> error

## 数据流
1. 首页加载
- 前端调用 POST /api/exec：{ platform, function: 'toplists', params: {} }
- 适配器输出 Chart[]

2. 榜单详情
- 前端调用 POST /api/exec：{ platform, function: 'toplist', params: { id } }
- 适配器输出 Playlist（含 tracks）

3. 歌单详情
- 前端调用 POST /api/exec：{ platform, function: 'playlist', params: { id } }
- 适配器输出 Playlist

4. 搜索
- 前端调用 POST /api/exec：{ platform, function: 'search', params: { keyword, page, pageSize } }
- 适配器输出 Track[]

5. 播放
- 前端调用 POST /api/parse：{ platform, ids, quality }
- 解析 items 并更新播放器与歌词

## 错误处理与降级
1. 401/403：提示鉴权失败或 Key 无效
2. 402（积分不足）：提示积分不足，停止播放解析
3. 404：提示资源不存在
4. 429：提示请求过于频繁
5. 500/502：提示服务异常，请稍后重试
6. 空结果：展示空态与重试入口
7. 无歌词：歌词面板显示“暂无歌词”
8. 无播放链接：播放器进入可恢复错误态
9. 网络超时：提示超时并允许手动重试
10. 未知平台/方法/质量：提示参数错误

播放器错误态恢复（默认文案）：
1. “重试解析”
2. “更换音质重试”
3. “返回列表”

## 视觉与交互规范
布局与尺寸：
1. 页面最大宽度 1200px
2. 顶部导航高度 64px
3. 榜单卡片 200-240px 方形封面
4. 主要间距 16/24/32 的节奏

字体与层级：
1. 字体优先级：Noto Sans SC，回退 Microsoft YaHei
2. 标题字重 600，正文 400
3. 关键数字使用等宽数字样式（CSS font-variant-numeric: tabular-nums）

色彩：
1. 背景：#F7F8FA
2. 主文字：#111827
3. 次文字：#6B7280
4. 主强调：#2563EB
5. 卡片边框：#E5E7EB
6. hover 阴影：轻质阴影（不超过 12px 模糊）

交互：
1. 卡片 hover 提升 2-4px
2. 播放按钮 hover 变色
3. 骨架屏用于加载阶段

响应式：
1. >= 1200px：完整布局
2. 1024-1199px：卡片缩小，保持 4 列
3. 768-1023px：降为 2-3 列，播放器仍常驻
4. < 768px：首版仅基本可用（非优化目标）

## 测试策略（首版）
后端：
1. 代理接口基础单测
2. 错误码处理断言
3. 缓存命中/失效测试
4. 质量自动降级测试

前端：
1. 归一化函数单测
2. 歌词解析与时间轴滚动单测
3. 播放器状态机基本用例

端到端（可选）：
1. 首页 -> 榜单 -> 播放页流程

## 交付清单
1. 前端 UI 与路由
2. 后端代理与缓存
3. 前端数据适配器
4. 播放器与歌词组件
5. 基础测试
