# 部署

**状态**：本地可跑，**内网可预览**；公网部署未完成，卡在凭据（见下文）。交付说明：`本地可跑，线上未尝试：当前环境没有腾讯云凭据，CloudBase / EdgeOne Makers 两个集成在本会话里都返回 disconnected`。

## 一、内网预览（现在就能用）

| 地址 | 跑的是什么 | 用途 |
| --- | --- | --- |
| `http://192.168.1.104:5200/` | `vite` 开发服务器（`--host 0.0.0.0`） | 改文案、看最新代码，`?edit=1` 可在线改字 |
| `http://192.168.1.104:5210/` | `vite preview` 跑 `dist/` 构建产物 | 接近线上效果，手机/平板试用走这个 |

- 两个端口都监听 `0.0.0.0`，同一局域网内的设备可以直接访问；`/r/8472` 这类路径会回退到 `index.html`。
- 手机扫码进房时，二维码指向当前访问地址（`location.origin`），内网环境下就是 `192.168.1.104:5210`。
- **如果手机打不开**：Windows 防火墙默认拦入站。用管理员 PowerShell 执行一次：

  ```
  netsh advfirewall firewall add rule name="多人ARG preview" dir=in action=allow protocol=TCP localport=5200,5210 profile=private
  ```

- 这两个服务是我手工起的后台进程，机器重启或进程被杀就没了。重新起：

  ```
  npm run dev:lan                                  # 5200，开发服务器
  npm run build && npm run preview -- --host 0.0.0.0 --port 5210
  ```

## 二、公网部署：卡在哪

按用户要求，公网部署不再用 Cloudflare，改腾讯云。这一轮尝试的结果：

1. `invoke_integration(CloudBase, deploy)` → `status: disconnected`，工具只返回推荐，没有真正发起部署。
2. `invoke_integration(EdgeOne Makers, deploy)` → 同样 `disconnected`。
3. 本机没有 CloudBase 的登录态：没有 `~/.cloudbase`，没有 `.cloudbaserc.json`，环境变量里也没有 `TENCENTCLOUD_SECRETID` / `SECRETKEY` / `CLOUDBASE_ENV_ID`。
4. 因此 `tcb hosting deploy` 无法在无人值守的情况下跑起来（要么扫码登录，要么先配好密钥）。

**没有伪造部署结果**：这台机器上现在没有任何公网地址可访问。

## 三、恢复后怎么补上这一步

任选一条，都不需要改代码：

1. **在 CodeBuddy 里点部署**：把项目连到 CloudBase，选择静态托管，构建目录填 `dist`。
2. **命令行**（先装 CLI 并登录一次）：

   ```
   npm i -g @cloudbase/cli
   tcb login                                    # 扫码，一次即可
   tcb hosting deploy dist -e <你的环境ID>
   ```

   静态托管要开启「索引文档 `index.html`」，并把 404 指到 `index.html`，否则直接打开 `/r/8472` 会 404。

3. **EdgeOne Makers**：本项目是纯静态产物（`dist/`），把它们当静态站点部署即可，路由回退规则同上。

## 四、部署前要补的事

- **房间还全是假数据**：Phase 2 的创建/加入、Durable Object、WebSocket 都没做，线上多人不会互通。现在部署上去只能验界面与交互。
- 上线后 `/api/*`、`/p`、`/ws/*` 都还没有后端，`worker/index.ts` 仍是 501 占位。
- `PROXY_SECRET` 等密钥目前只在本地 `.dev.vars` / `.env`，没有随代码提交。

## 五、自检记录

- `npm run typecheck` 通过（src 与 worker 两份 tsconfig）。
- `npm run build` 通过，`dist/` 产出 `index.html` + 一个 CSS + 一个 JS。
- `dist` 产物在 5210 上跑通：首页、`/r/8472`、沉浸模式、移动端抽屉都验过。
- 验收截图在 `docs/shots/`（home / setup / room-ipad / room-phone）。
