// 四张验收截图。起一个临时后端（独立数据目录），灌一批真实数据，再用系统 Edge 截图。
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import WebSocket from 'ws'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const PORT = 8790
const BASE = `http://127.0.0.1:${PORT}`
const OUT = path.join(ROOT, 'docs', 'shots')
const DATA = path.join(ROOT, '.data-shots')

const server = spawn(process.execPath, ['server/index.mjs'], {
  cwd: ROOT,
  stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), ARG_DATA_DIR: DATA },
})

async function waitFor(url, timeoutMs = 40000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`not ready: ${url}`)
}

function stop() {
  try {
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      server.kill('SIGTERM')
    }
  } catch {
    /* 收尾失败不影响截图 */
  }
}

async function post(url, body) {
  const res = await fetch(BASE + url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function connect(roomId, memberId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?room=${roomId}&member=${memberId}`)
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
  })
}

const ONBOARDED = () => {
  try {
    localStorage.setItem('arg:coach', 'true')
    localStorage.setItem('arg:name', '访客一')
  } catch {
    /* 忽略 */
  }
}

async function seed() {
  const created = await post('/api/room', {
    url: 'https://mminghuo.github.io/forum/',
    modules: ['note', 'keyword', 'person', 'secret', 'timeline'],
    name: '老周',
    title: '关于灵异论坛的调查记录',
  })
  const roomId = created.room.id

  const people = []
  const lin = await post(`/api/room/${roomId}/join`, { name: '小林' })
  const lan = await post(`/api/room/${roomId}/join`, { name: '阿岚' })

  people.push({ member: created.member, ws: await connect(roomId, created.member.id) })
  people.push({ member: lin.member, ws: await connect(roomId, lin.member.id) })
  people.push({ member: lan.member, ws: await connect(roomId, lan.member.id) })

  const by = (name) => people.find((p) => p.member.name === name).ws
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const items = [
    { who: '老周', item: { type: 'link', url: '/mock-game.html?p=duty', title: '值班表' } },
    { who: '小林', item: { type: 'note', text: '登录页那句「03:58 有人进过值班室」，记得截图。' } },
    { who: '阿岚', item: { type: 'note', text: '第三页右下角有个小字，放大才看得清。' } },
    { who: '老周', item: { type: 'keyword', keyword: '符咒', result: 'hit' } },
    { who: '阿岚', item: { type: 'secret', secret: { account: '值班室', password: '8472', usage: '三楼东侧', verified: true } } },
    { who: '小林', item: { type: 'note', text: '搜「符咒」出来的那页，标题跟目录对不上。', starred: true } },
    {
      who: '老周',
      item: {
        type: 'person',
        person: { name: '老张', note: '值班表上签名的人' },
        relations: [{ from: '老张', to: '小林', label: '同乡' }],
      },
    },
    { who: '阿岚', item: { type: 'event', event: { at: '03:58', text: '值班室灯亮了' } } },
    { who: '小林', item: { type: 'note', text: '先试试「管理员」这个词。', status: 'excluded' } },
  ]

  for (const entry of items) {
    by(entry.who).send(JSON.stringify({ t: 'item.add', item: entry.item }))
    await sleep(160)
  }

  await sleep(400)
  for (const p of people) p.ws.close()

  return roomId
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await rm(DATA, { recursive: true, force: true })
  await waitFor(`${BASE}/api/health`)
  const roomId = await seed()

  const browser = await chromium.launch({ channel: 'msedge' })

  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: 'zh-CN',
    })
    const page = await desktop.newPage()
    await page.goto(`${BASE}/?shot=1`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(OUT, 'home.png') })
    console.log('home.png')

    await page.goto(
      `${BASE}/setup?u=${encodeURIComponent('https://mminghuo.github.io/forum/')}&preset=lingyi-forum&shot=1`,
      { waitUntil: 'networkidle' },
    )
    await page.setViewportSize({ width: 1180, height: 820 })
    await page.fill('#name', '陈默')
    await page.locator('#name').blur()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(OUT, 'setup.png') })
    console.log('setup.png')

    const pad = await browser.newContext({
      viewport: { width: 1180, height: 820 },
      deviceScaleFactor: 2,
      locale: 'zh-CN',
    })
    await pad.addInitScript(ONBOARDED)
    const padPage = await pad.newPage()
    await padPage.goto(`${BASE}/r/${roomId}?shot=1`, { waitUntil: 'domcontentloaded' })
    await padPage.waitForSelector('.msg-bubble', { timeout: 15000 })
    await padPage.waitForTimeout(600)
    // 右边缘划一下 → 图标浮出 → 点「聊天」展开面板
    await padPage.locator('.seam-zone').click({ position: { x: 12, y: 400 } })
    await padPage.waitForTimeout(500)
    await padPage.locator('.rail-btn').nth(1).click()
    await padPage.waitForTimeout(900)
    await padPage.screenshot({ path: path.join(OUT, 'room-ipad.png') })
    console.log('room-ipad.png')

    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: 'zh-CN',
      isMobile: true,
      hasTouch: true,
    })
    await phone.addInitScript(ONBOARDED)
    const phonePage = await phone.newPage()
    await phonePage.goto(`${BASE}/r/${roomId}?shot=1`, { waitUntil: 'domcontentloaded' })
    await phonePage.waitForSelector('.conveyor', { timeout: 15000 })
    await phonePage.waitForTimeout(600)
    await phonePage.locator('.conveyor').click()
    await phonePage.waitForTimeout(800)
    await phonePage.screenshot({ path: path.join(OUT, 'room-phone.png') })
    console.log('room-phone.png')
  } finally {
    await browser.close()
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    stop()
    await rm(DATA, { recursive: true, force: true }).catch(() => {})
  })
