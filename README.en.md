<div align="center">

# Multi-ARG

**Several people, one puzzle page, one shared room.**

Join by room code · chat while you play · characters, keywords, passwords and a timeline · one process for the whole stack

[Live demo](https://multi-arg.onrender.com) · [中文](./README.md)

</div>

---

> Most browser puzzle games are built for one player: one person turns the pages, one person keeps notes, one person keeps asking everyone to wait while they take a screenshot.
> Multi-ARG puts a shared workbench next to the game. It does not modify the game, and the game does not need to know it exists.

## What it does

- **One room, one timeline** — who saw which page, who shared what, in order.
- **Four side tools** — a draggable relationship graph, three-state keywords (untried / valid / invalid), a password book, and a timeline.
- **Actually realtime** — WebSocket broadcast: messages, stars and reordered items show up on everyone's screen in a few hundred milliseconds.
- **Every screen** — desktop and tablet fill the viewport; phones get a bottom drawer you can drag.
- **Durable** — SQLite on disk locally, Turso (libSQL) in production, so a redeploy does not wipe the room.

## Quick start

Node 22+ required (built locally on Node 24; the old `node:sqlite` path is gone, everything goes through `@libsql/client`).

```bash
git clone https://github.com/ZhengTFB/multi-arg.git
cd multi-arg
npm ci
npm run build
npm run server          # http://127.0.0.1:8787
```

Editing:

```bash
npm run server          # terminal 1: backend on 8787
npm run dev             # terminal 2: frontend on 5173, /api and /ws proxied
```

Try it from other devices on your LAN:

```bash
npm run dev:lan         # listens on 0.0.0.0:5200
```

> On Windows, if phones cannot connect, it is almost always the firewall. Run this once in an elevated PowerShell:
> `netsh advfirewall firewall add rule name="multi-arg" dir=in action=allow protocol=TCP localport=5200,8787 profile=private`

## Using it

1. Paste a puzzle URL on the home page, pick the tools for this session, enter a name.
2. You get a 4-digit room code — read it to your friends, or send the invite QR.
3. While playing: drop clues into the chat, log keywords with `词 符咒=有效`, passwords with `密 值班室/8472/三楼`, star anything worth keeping.

## Architecture

```
src/                 frontend (React 18 + Vite 6)
  routes/            home / setup / room
  components/        panel, chat feed, notes, the four modules, browser chrome
  lib/net.ts         REST + WebSocket client with exponential backoff
server/              backend (Node http + ws)
  index.mjs          static files + /api + /ws in one process, one port
  api.mjs            create room, join, resume identity
  ws.mjs             snapshot + deltas; only the author can edit their own items
  db.mjs             @libsql/client — same code for file: and Turso
```

- **All writes go through the WebSocket.** The server fills in `id`, author and timestamp, persists, then broadcasts.
- **Refresh keeps your identity.** The member id lives in the browser; `GET /api/room/:id/state` restores the session.
- **Read-only after 7 days, purged on day 37** by a scheduled job in the server.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run server` | Start the backend (also serves `dist/`) |
| `npm run dev` | Frontend dev server with `/api` and `/ws` proxy |
| `npm run build` | Build the frontend into `dist/` |
| `npm run typecheck` | Type check both tsconfigs |
| `npm run shots` | Boot a throwaway backend, seed data, re-shoot the four screenshots |
| `npm run qa:smoke` | Backend smoke: create → two clients → broadcast → permission → presence |
| `npm run qa:live` | End-to-end: two browsers in one room, survives a reload |
| `npm run qa:ui` | UI: naming gate, default panel, address bar, module creation, tabs |
| `npm run qa:modules` | Modules: relations, timeline drag, plaintext passwords |

## Deployment

Production runs on **Render** (Node web service) + **Turso** (libSQL). `render.yaml` describes it; pushing to `main` deploys.

```yaml
buildCommand: npm ci && npm run build
startCommand: node server/index.mjs
```

Two environment variables:

| Variable | Meaning |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://<db>-<org>.aws-ap-southeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso database token |

Both are required to use Turso; with either missing the server falls back to a local SQLite file, so a half-configured deploy still boots.

## Known limits

- Room codes are 4 digits: rate limited to 30 joins per minute per IP, but anyone with the code gets in.
- Links with `target="_blank"` inside a cross-origin iframe cannot be intercepted — they open a real browser tab. Everything else opens in an in-app tab.
- Render's free instance sleeps after 15 idle minutes; cold starts take 30–60 seconds.

## License

[MIT](./LICENSE)
