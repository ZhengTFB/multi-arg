---
name: render-turso-deploy
description: 把一个 Node 网页应用（REST + WebSocket + SQLite）部署到 Render，用 Turso 做持久化。当用户说「部署到 Render」「要一个国内能访问的 Node 站点」「本地 SQLite 要换成云端库」，或需要一个可复制的部署流程时使用。
---

# Render + Turso 部署

把「本地能跑的 Node 全栈」变成「公网能访问、重启不掉数据」的站点。本项目（多人 ARG）已经按这套流程跑通，可以直接照抄，也可以给其它项目复用。

## 什么时候用

- 应用是**单个 Node 进程**（HTTP + WebSocket 都行），不需要容器编排。
- 数据库是 SQLite，想搬到云端又不改 SQL。
- 用户没有域名、没有服务器，只有 GitHub 账号。

不适用：需要持久磁盘写文件、需要 GPU、需要多副本共享内存。

## 前置条件

| 东西 | 用途 | 拿法 |
| --- | --- | --- |
| GitHub 账号 | 存代码，Render 从仓库拉 | 用户已有 |
| Render 账号 | 跑服务 | 用 GitHub OAuth 注册，**别用 QQ 邮箱**（见坑 1） |
| Turso 账号 | 托管 libSQL | GitHub/邮箱注册，建库后拿 URL + Token |

凭证统一放项目根的 `.env.local`（已 gitignore）：

```
TURSO_DATABASE_URL=libsql://<db>-<org>.aws-ap-southeast-1.turso.io
TURSO_AUTH_TOKEN=<token>
```

服务端启动时读它（`server/env.mjs`），线上则由平台注入同名环境变量。

## 步骤

### 1. 让代码支持两种数据库

```bash
npm i @libsql/client
```

把 `node:sqlite` 的同步调用换成 `@libsql/client` 的异步调用：一条 `createClient({ url, authToken })`，本地用 `file:...`，线上用 `libsql://...`。

关键点：**两个变量都齐了才连 Turso**，缺一个退回本地文件，避免线上因为少配一个变量起不来。

```js
const useTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
const url = useTurso ? process.env.TURSO_DATABASE_URL : `file:${localPath}`
```

建表语句放在 `db.batch([...], 'write')` 里，启动时 `await initDb()` 一次。

### 2. 本地验证（先别上云）

```bash
npm run server        # db 日志里应出现 local-sqlite 或 turso
npm run qa:smoke      # 接口 + 长连接
npm run qa:live       # 双浏览器端到端
```

再用 `.env.local` 里的 Turso 变量重启一次，确认日志变成 `turso`、`qa:smoke` 仍然全绿。**云库有 100–300ms 延迟，测试里的固定等待要放宽**，否则会偶发失败。

### 3. 建 Turso 库

网页控制台：`app.turso.tech` → Create Database → 名字、地区选**新加坡**（离国内最近）→ 建完在库里点 Create Token → 选 never / Read & Write → 复制 token（只显示一次）。

或者 CLI：

```bash
turso db create <name> --location aws-ap-southeast-1
turso db show <name> --url
turso db tokens create <name>
```

### 4. 推 GitHub

```bash
gh auth status            # 没登录就 gh auth login
gh repo create <name> --public --source=. --push
# 已有仓库：
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

`gh` 若报 `dial tcp ... timeout`，是 github.com 的连通性问题，重试几次；本机 git 通常还能推。

### 5. 写 render.yaml

```yaml
services:
  - type: web
    name: <service-name>
    runtime: node
    plan: free
    region: singapore
    branch: main
    buildCommand: npm ci && npm run build
    startCommand: node server/index.mjs
    healthCheckPath: /api/health
    autoDeploy: true
    envVars:
      - key: NODE_VERSION
        value: "24"
      - key: TURSO_DATABASE_URL
        sync: false
      - key: TURSO_AUTH_TOKEN
        sync: false
```

`sync: false` 表示「部署时填值」，不会把密钥写进仓库。**注意：Blueprint 表单里这两个值经常只填进去第一个**，部署完务必去服务页确认第二个也在。

### 6. 创建服务

`dashboard.render.com/blueprints/new` → 填仓库地址 `https://github.com/<user>/<repo>` → Continue → 填 Blueprint 名称 → 检查环境变量 → Deploy Blueprint。

首次部署 2–4 分钟。完成后地址是 `https://<service-name>.onrender.com`：

```bash
curl -s https://<service-name>.onrender.com/api/health
```

### 7. 验收

- `POST /api/room` 能建房、`/r/<id>` 能开。
- 两个浏览器同房互发消息。
- 重启实例（Manual Deploy）后数据还在（证明 Turso 生效，不是本地文件）。

## 坑

1. **Render 拒收 QQ 邮箱**：`@qq.com` 直接判 `invalid`，gmail / 163 / outlook / 自建域名都能过。用 GitHub OAuth 注册也一样要在最后一步填一个非 QQ 的邮箱。
2. **hCaptcha**：注册页挂 hCaptcha，自动化点击通常拿不到 token（控制台可见 `ERR_CONNECTION_CLOSED`），需要人接管点一下。
3. **`*.onrender.com` 在国内是 DNS 污染**：解析偶尔落到 `108.162.198.250` 这类假 IP。验证方法 `curl --resolve <host>:443:216.24.57.18`——能通 200 说明只是 DNS 问题，不是 IP 封锁。解法：自有域名 CNAME、本机 hosts，或换国内云。
4. **免费实例 15 分钟休眠**：冷启动 30–60 秒，第一次访问慢不是挂了。
5. **免费实例没有持久磁盘**：`/tmp` 会随实例销毁，所以必须用 Turso，否则每次重新部署清库。
6. **Blueprint 的环境变量**：`sync: false` 的变量在表单里容易漏填，部署后在服务页 Environment 里再确认一遍。
7. **Node 版本**：`node:sqlite` 在 Node 22 需要 flag，24 才默认可用；迁移到 `@libsql/client` 后就不挑版本了，但仍建议在 `render.yaml` 里钉 `NODE_VERSION=24`。

## 完成标准

- 线上 `/api/health` 返回 200。
- 建房 → 进房 → 发消息 → 刷新仍在。
- 手动 redeploy 后数据仍在。
- 仓库里有 `render.yaml`、README 写了环境变量表。
