import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:8787'
const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'zh-CN' })
const page = await ctx.newPage()

await page.goto(`${BASE}/setup?u=${encodeURIComponent('https://mminghuo.github.io/forum/')}&preset=lingyi-forum`, {
  waitUntil: 'networkidle',
})
await page.fill('#name', '陈默')
await page.getByRole('button', { name: '开始' }).click()
await page.waitForSelector('.room', { timeout: 15000 })
console.log('url:', page.url())
console.log('room label:', await page.locator('.panel-room-label').innerText())
await page.waitForTimeout(600)

await page.locator('.seam-zone').click({ position: { x: 12, y: 400 } })
await page.waitForTimeout(400)
await page.locator('.rail-btn').nth(1).click()
await page.waitForTimeout(500)
await page.locator('[data-composer]').fill('先记一笔')
await page.locator('[data-composer]').press('Enter')
await page.waitForTimeout(600)
console.log('own message:', await page.locator('.msg-bubble').filter({ hasText: '先记一笔' }).count())

// 星标 → 笔记页的公共笔记
const star = page.locator('.msg-action').first()
await page.locator('.msg').last().hover()
await star.click()
await page.waitForTimeout(500)

await page.getByRole('tab', { name: '笔记' }).click()
await page.waitForTimeout(500)
console.log('public notes:', await page.locator('.note-section[data-tone="public"] .note-line').count())

await page.screenshot({ path: 'refs/_qa/created.png' })
await browser.close()
