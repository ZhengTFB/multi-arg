<div align="center">

# 多人 ARG

**几个人同时翻开同一个解谜网页，把看到的线索丢进同一个房间。**

房间号直接进 · 边玩边聊 · 人物关系 / 关键词 / 密码 / 时间线四件套 · 一条链路上跑完前后端

[在线体验](https://multi-arg.onrender.com) · [English](./README.en.md)

</div>

---

> 现在很多网页解谜是给一个人设计的：一个人翻页、一个人记线索、一个人在群里发“等等我截个图”。
> 多人 ARG 把这层协作做进游戏外面——不改造游戏，也不要求游戏配合，只是给几个人一个共同的工作台。

## 它能做什么

- **一个房间，一条时间线**：谁在什么时候看到了哪一页，谁分享了什么，全部按时间排好。
- **四件辅助工具**：人物关系图（可拖拽、可连线）、关键词三态（未尝试 / 有效 / 无效）、密码本、时间线。
- **真的实时**：WebSocket 广播，别人发的消息、改的星标、拖的顺序，几百毫秒内出现在你屏幕上。
- **不挑设备**：电脑和平板占满屏，手机是底部抽屉，手指一推就开。
- **数据不丢**：SQLite 落到本地文件，线上用 Turso（libSQL）托管，重新部署也不清库。

## 快速开始

需要 Node 22 以上（本地用的是 Node 24，内置 `node:sqlite` 已不再使用，现在统一走 `@libsql/client`）。

```bash
git clone https://github.com/ZhengTFB/multi-arg.git
cd multi-arg
npm ci
npm run build
npm run server          # http://127.0.0.1:8787
```

想边改边看：

```bash
npm run server          # 终端 1：后端 8787
npm run dev             # 终端 2：前端 5173，/api 与 /ws 已代理到 8787
```

局域网里给别人试（手机、平板）：

```bash
npm run dev:lan         # 监听 0.0.0.0:5200
```

> Windows 上第一次手机连不上，多半是防火墙。管理员 PowerShell 跑一次：
> `netsh advfirewall firewall add rule name="multi-arg" dir=in action=allow protocol=TCP localport=5200,8787 profile=private`

## 怎么用

1. 首页粘贴一个网页解谜的链接 →「配置」页勾选这局要用的辅助工具 → 起个名字 → 开始。
2. 得到 4 位房间号，念给朋友，或者把邀请二维码发过去。
3. 玩的时候：看到线索就发进聊天；`词 符咒=有效` 记关键词，`密 值班室/8472/三楼` 记密码，右键的东西都能星标进公共笔记。

## 技术结构

```
src/                 前端（React 18 + Vite 6）
  routes/            首页 / 配置 / 房间
  components/        面板、聊天流、笔记、四个模块、浏览器条
  lib/net.ts         REST + WebSocket 客户端（指数退避重连）
server/              后端（Node 原生 http + ws）
  index.mjs          静态资源 + /api + /ws，一个进程一个端口
  api.mjs            建房、进房、换回身份
  ws.mjs             快照 + 增量广播，只有作者能改自己的条目
  db.mjs             @libsql/client，本地 file: 与 Turso 同一套代码
```

- **写入一律走 WebSocket**：服务端补 `id` / 作者 / 时间后落库，再广播给房间里所有人。
- **刷新不丢身份**：成员 id 存在浏览器，刷新用 `GET /api/room/:id/state` 换回。
- **7 天只读，第 37 天清库**，由服务端定时任务执行。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run server` | 起后端（同时托管 `dist/`） |
| `npm run dev` | 前端开发服务器，带 `/api` `/ws` 代理 |
| `npm run build` | 构建前端到 `dist/` |
| `npm run typecheck` | 前端与 worker 两份 tsconfig 的类型检查 |
| `npm run shots` | 起一个临时后端灌数据，重出四张验收截图 |
| `npm run qa:smoke` | 后端冒烟：建房 → 双人 → 广播 → 越权拦截 → presence |
| `npm run qa:live` | 端到端：两个浏览器同房互发、刷新后消息仍在 |
| `npm run qa:ui` | 界面：起名、默认开栏、地址栏、模块新建、标签页 |
| `npm run qa:modules` | 模块：连线、时间线拖拽、密码明文 |

## 部署

线上跑在 **Render**（Node Web Service）+ **Turso**（libSQL），由 `render.yaml` 描述，推 `main` 自动部署：

```yaml
buildCommand: npm ci && npm run build
startCommand: node server/index.mjs
```

需要两个环境变量：

| 变量 | 说明 |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://<库名>-<组织>.aws-ap-southeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 数据库 token |

两个都在时连 Turso；缺一个就退回本地 SQLite 文件（不会因为少配一个变量起不来）。

## 已知限制

- 房间号只有 4 位，靠 IP 限流（30 次/分钟）挡扫号，知道号就能进。
- 跨域 iframe 里 `target="_blank"` 的链接拦不住，会真的开系统标签页；其余入口都在应用内开标签。
- Render 免费实例 15 分钟无请求会休眠，冷启动 30–60 秒。

## 许可

[MIT](./LICENSE)
