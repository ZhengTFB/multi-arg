import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:8787'

const created = await (
  await fetch(`${BASE}/api/room`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: 'https://mminghuo.github.io/forum/',
      modules: ['note', 'keyword', 'person', 'secret', 'timeline'],
      name: '陈默',
      title: '关于灵异论坛的调查记录',
    }),
  })
).json()

const roomId = created.room.id
console.log('room', roomId)

const browser = await chromium.launch({ channel: 'msedge' })

async function open(name) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'zh-CN' })
  await ctx.addInitScript((n) => {
    localStorage.setItem('arg:name', n)
    localStorage.setItem('arg:coach', 'true')
  }, name)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/r/${roomId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.room', { timeout: 15000 })
  await page.waitForTimeout(500)
  return { ctx, page }
}

const a = await open('陈默')
const b = await open('小林')

console.log('A title:', await a.page.title())
console.log('A members chip:', await a.page.locator('.panel-count').first().innerText().catch(() => 'panel closed'))

// 打开 A 的面板
await a.page.locator('.seam-zone').click({ position: { x: 12, y: 400 } })
await a.page.waitForTimeout(400)
await a.page.locator('.rail-btn').nth(1).click()
await a.page.waitForTimeout(600)

// A 发一条
await a.page.locator('[data-composer]').fill('第三页右下角有个小字')
await a.page.locator('[data-composer]').press('Enter')
await a.page.waitForTimeout(700)

// B 也打开面板看
await b.page.locator('.seam-zone').click({ position: { x: 12, y: 400 } })
await b.page.waitForTimeout(400)
await b.page.locator('.rail-btn').nth(1).click()
await b.page.waitForTimeout(700)

const bSees = await b.page.locator('.msg-bubble').filter({ hasText: '第三页右下角' }).count()
console.log('B 收到 A 的消息:', bSees === 1)

const aBubbles = await a.page.locator('.msg-bubble').count()
console.log('A 自己有一条:', aBubbles >= 1)

// B 回一条
await b.page.locator('[data-composer]').fill('我这边也看到了')
await b.page.locator('[data-composer]').press('Enter')
await b.page.waitForTimeout(800)
const aSees = await a.page.locator('.msg-bubble').filter({ hasText: '我这边也看到了' }).count()
console.log('A 收到 B 的回复:', aSees === 1)

// 刷新后仍在
await a.page.reload({ waitUntil: 'domcontentloaded' })
await a.page.waitForSelector('.room', { timeout: 15000 })
await a.page.waitForTimeout(600)
const afterReload = await a.page.locator('.msg-bubble').filter({ hasText: '第三页右下角' }).count()
console.log('刷新后消息还在:', afterReload === 1)

await a.page.screenshot({ path: 'refs/_qa/live-a.png' })
await b.page.screenshot({ path: 'refs/_qa/live-b.png' })

await browser.close()
