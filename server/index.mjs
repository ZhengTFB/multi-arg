import './env.mjs'
import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from './api.mjs'
import { attachWs } from './ws.mjs'
import { initDb, purgeExpired, dbKind } from './db.mjs'
import { handleProxy, proxyPathFromReferer } from './proxy.mjs'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function serveFile(res, filePath) {
  const stat = statSync(filePath)
  res.writeHead(200, {
    'content-type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
  })
  createReadStream(filePath).pipe(res)
}

function serveStatic(req, res, pathname) {
  if (!existsSync(DIST)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('还没有构建产物，先跑 npm run build')
    return
  }

  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const target = path.join(DIST, safe === '/' ? 'index.html' : safe)

  if (target.startsWith(DIST) && existsSync(target) && statSync(target).isFile()) {
    serveFile(res, target)
    return
  }

  // SPA 回退：/r/8472、/setup 这些路径都交给 index.html
  const index = path.join(DIST, 'index.html')
  if (existsSync(index)) {
    serveFile(res, index)
    return
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('not found')
}

function existsInDist(pathname) {
  if (!existsSync(DIST)) return false
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const target = path.join(DIST, safe === '/' ? 'index.html' : safe)
  return target.startsWith(DIST) && existsSync(target) && statSync(target).isFile()
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, url)
    if (!handled) {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'not_found' }))
    }
    return
  }

  // 外部游戏页挂到同源下，才读得到地址、拦得住外链
  if (url.pathname.startsWith('/p/')) {
    await handleProxy(req, res, url)
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }

  // 被代理页里 JS 拼出来的绝对路径（`/data/x.json`）会落在这里，按 Referer 折回代理
  if (req.headers.referer && !existsInDist(url.pathname)) {
    const base = proxyPathFromReferer(req.headers.referer)
    if (base) {
      const scheme = base.protocol.replace(':', '')
      res.writeHead(302, {
        location: `/p/${scheme}/${base.host}${url.pathname}${url.search}`,
        'cache-control': 'no-store',
      })
      res.end()
      return
    }
  }

  serveStatic(req, res, url.pathname)
})

attachWs(server)

await initDb()
await purgeExpired()
setInterval(() => {
  purgeExpired().catch(() => {})
}, 60 * 60 * 1000).unref()

server.listen(PORT, HOST, () => {
  console.log(`[arg] http://${HOST}:${PORT}  (db: ${dbKind}, dist: ${DIST})`)
})
