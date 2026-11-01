# 部署

**状态**：本地整套跑通了（页面 + 接口 + 长连接，单端口）；公网跑在 Render：`https://multi-arg.onrender.com`。**新提交不会自动上线，需要在面板点一次 Manual Deploy**（`git push` 后线上仍是旧包，这是踩过的坑）。

## 零、重新部署（改完代码必须做）

1. `git push origin main`
2. `dashboard.render.com` → `multi-arg` 服务 → 右上 **Manual Deploy** → **Deploy latest commit**
3. 等 2–4 分钟，验收：`curl https://multi-arg.onrender.com/` 里 `assets/index-*.js` 的哈希要和本地 `dist/index.html` 一致；`curl -o NUL -w "%{http_code}" https://multi-arg.onrender.com/p/https/example.com/` 返回 200 且内容是被代理站点的 HTML（不是 500 多字节的 SPA 骨架，那说明还是旧包）。

## 一、本地 / 局域网（现在能用）

```bash
npm run build      # 前端产物进 dist/
npm run server     # Node 后端，默认 8787，监听 0.0.0.0
```

一个端口同时提供三样东西：

| 路径 | 内容 |
| --- | --- |
| `/` `/setup` `/r/8472` | `dist/` 里的前端（SPA 回退到 `index.html`） |
| `/api/*` | 建房、进房、拉状态 |
| `/ws?room=&member=` | 房间长连接（快照 + 增量广播） |

- 本机：`http://127.0.0.1:8787/`
- 局域网：`http://192.168.1.104:8787/`（手机/平板填这个）
- 数据：`.data/arg.db`（SQLite，WAL）。删掉这个目录就是全新环境。
- 端口/数据目录可用环境变量改：`PORT=9000 ARG_DATA_DIR=./tmp npm run server`。

**手机打不开**多半是 Windows 防火墙拦入站，管理员 PowerShell 跑一次：

```
netsh advfirewall firewall add rule name="多人ARG 8787" dir=in action=allow protocol=TCP localport=8787 profile=private
```

## 二、开发模式

```bash
npm run server     # 终端 1：后端 8787
npm run dev        # 终端 2：前端 5173，/api 与 /ws 已代理到 8787
```

`?edit=1` 的文案校对只在开发模式下可用（写回 `src/copy.json`）。

## 二点五、游戏页为什么要走代理

房间里打开的第三方网页统一走同源代理 `/p/<scheme>/<host>/<path>`（`server/proxy.mjs`）：

- **分享**：同源之后 `iframe.contentWindow.location.href` 读得到，分享出去的是用户眼前那一页的真实长地址，而不是只有域名。
- **点击**：服务端往 HTML 里注入桥接脚本，拦截站内跳转、`target=_blank`、`window.open`，统一 `postMessage` 回主页面；主页面按「同站就换页、站外就在房间里开新标签」处理，不会整页跳走。
- **根相对链接**：`/about/` 这种按被代理站点的路径解释（自动补 `/p/https/host` 前缀），否则会落到我们自己的 SPA 上。
- 抓不到（要登录、拒绝抓取）的站点退回直连 `directHosts`，此时才读不到地址，分享时会提示用户粘一次。

## 三、后端是什么

- `server/index.mjs`：HTTP 入口 + 静态托管 + SPA 回退。
- `server/api.mjs`：`POST /api/room`、`POST /api/room/:id/join`、`GET /api/room/:id`、`GET /api/room/:id/state`、`GET /api/health`。
- `server/ws.mjs`：`snapshot` / `item.add` / `item.patch` / `member.update` / `presence`，30 秒心跳，断线由前端指数退避重连。
- `server/db.mjs`：`node:sqlite`（Node 22+ 内置，无需编译原生模块），`rooms` / `members` / `items` 三张表。

房间规则：

- 只有 **4 位房间号**，没有口令；进房靠 IP 限流（每分钟 30 次）挡扫号。
- 成员身份存在浏览器 `arg:member:<房间号>`，刷新用 `GET /state` 换回，不会重复占名额。
- 写入一律走 WebSocket：服务端补 `id` / 作者 / 时间并落库，再广播给房间内所有人；**只有作者能改自己的条目**。
- 7 天内可写，之后只读；第 37 天整房清空（`purgeExpired` 每小时跑一次）。

## 四、公网部署：还差一步登录

试过的：

1. `invoke_integration(CloudBase, deploy)` / `(EdgeOne Makers, deploy)` 都返回 `disconnected`。
2. CloudBase MCP 本身可用，但 `auth(status)` 是 `REQUIRED`。发起过两次设备码登录，浏览器授权没有回传（码过期）。
3. 本机没有腾讯云密钥、没有 `cloudbase` CLI 登录态。

另外要提前说清楚：**现在的后端是 Node 常驻进程（`ws` + `node:sqlite`），CloudBase 静态托管放得下前端，但放不下它**。真上云有两条路：

- **CloudBase 云托管（容器）**：把 `server/` 打进镜像，一端口跑 API + WS + 静态文件，最省改动的路径。
- **改成云函数 + 云数据库**：写操作走云函数据、实时性靠轮询或数据库 watch，需要重写 `server/` 这一层。

登录恢复后可以这样继续：

```bash
# 方式一：MCP 设备码（需要你在浏览器点确认）
#   auth(start_auth) → 打开 verification_uri → 确认 → auth(status)
# 方式二：API Key（控制台建，权限选环境管理 + 云函数）
#   auth(login_by_api_key, apiKey=..., apiKeyEnvId=...)
# 方式三：CLI
npm i -g @cloudbase/cli && tcb login && tcb hosting deploy dist -e <环境ID>
```

## 五、自检记录

- `npm run typecheck` 通过（src 与 worker 两份 tsconfig）。
- `npm run build` 通过。
- 后端接口/长连接：`npm run qa:smoke`（建房 → 双人 → 广播 → 越权拦截 → presence）6/6 通过。
- 端到端：`npm run qa:live`（两个浏览器同房收发、刷新后消息仍在）4/4 通过。
- 代理桥接：起本地后端 + Edge 实测，同源可读 `location`、`/about/` 补前缀成 `/p/https/host/about/`、`target=_blank` 与 `window.open` 都带 `blank:true`、站外链接带真实 URL 交给房间开新标签。
- 配置页真实开房 → 发消息 → 星标进公共笔记，也手工验过。
- 四张验收截图由 `npm run shots` 现起一个临时后端灌数据后截取（`docs/shots/`）。
