import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = 'd:/Desktop/多人ARG'
const PORT = 5188
const BASE = `http://127.0.0.1:${PORT}`

const server = spawn('npx.cmd', ['vite', '--host', '127.0.0.1', '--port', String(PORT)], {
  cwd: ROOT,
  stdio: 'ignore',
  shell: true,
})
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(BASE)).ok) break
  } catch {}
  await new Promise((r) => setTimeout(r, 400))
}

const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto(`${BASE}/r/8472?shot=1#demo`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.locator('.conveyor').click()
await page.waitForTimeout(800)
console.log('open h:', await page.evaluate(() => Math.round(document.querySelector('.drawer').getBoundingClientRect().height)))

await page.mouse.click(60, 80)
await page.waitForTimeout(800)
console.log('after tap outside h:', await page.evaluate(() => Math.round(document.querySelector('.drawer').getBoundingClientRect().height)))

// 拖拽把手往下
await page.locator('.conveyor').click()
await page.waitForTimeout(700)
const box = await page.locator('.drawer-handle').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + 10)
await page.mouse.down()
await page.mouse.move(box.x + box.width / 2, box.y + 260, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(800)
console.log('after drag h:', await page.evaluate(() => Math.round(document.querySelector('.drawer').getBoundingClientRect().height)))

await browser.close()
spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
