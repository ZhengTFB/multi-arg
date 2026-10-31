import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = 'd:/Desktop/多人ARG'
const PORT = 5187
const BASE = `http://127.0.0.1:${PORT}`
const OUT = path.join(ROOT, 'refs', '_qa')

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

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge' })

const shot = async (page, name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, name) })
  console.log(name)
}

// 桌面：沉浸模式
const desk = await browser.newContext({ viewport: { width: 1180, height: 820 } })
await desk.addInitScript(() => {
  localStorage.setItem('arg:onboarded', 'true')
  localStorage.setItem('arg:coach', 'true')
})
const d = await desk.newPage()
await d.goto(`${BASE}/r/8472?shot=1#demo`, { waitUntil: 'networkidle' })
await d.waitForTimeout(500)
console.log('float entry:', await d.locator('.float-entry').count())
await shot(d, 'idle.png')

await d.locator('.float-entry').click()
await d.waitForTimeout(600)
await d.locator('.panel-collapse').click()
await d.waitForTimeout(700)
console.log('immersive:', await d.locator('.room[data-immersive="true"]').count())
console.log(
  'frame width:',
  await d.evaluate(() => Math.round(document.querySelector('.frame').getBoundingClientRect().width)),
)
await shot(d, 'immersive.png')

// 手机：引导 + 抽屉拖拽
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
const p = await phone.newPage()
await p.goto(`${BASE}/r/8472?shot=1#demo`, { waitUntil: 'networkidle' })
await p.waitForTimeout(600)
console.log('coach:', await p.locator('.coach').count())
await shot(p, 'coach.png')

await p.locator('.conveyor').click()
await p.waitForTimeout(700)
console.log('sheet h:', await p.evaluate(() => Math.round(document.querySelector('.drawer').getBoundingClientRect().height)))
await shot(p, 'sheet-half.png')

// 切到关键词：应自动到最高
await p.getByRole('tab', { name: '关键词' }).click()
await p.waitForTimeout(700)
console.log('sheet h after tab:', await p.evaluate(() => Math.round(document.querySelector('.drawer').getBoundingClientRect().height)))
await shot(p, 'sheet-module.png')

// 点遮罩收回
await p.locator('.sheet-scrim').click({ position: { x: 40, y: 60 } })
await p.waitForTimeout(600)
console.log('sheet h after scrim:', await p.evaluate(() => Math.round(document.querySelector('.drawer').getBoundingClientRect().height)))

// 首页滚到推荐
const home = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const h = await home.newPage()
await h.goto(`${BASE}/?shot=1`, { waitUntil: 'networkidle' })
await h.waitForTimeout(400)
await h.locator('.scroll-cue').click()
await h.waitForTimeout(1000)
console.log('reco in:', await h.evaluate(() => document.querySelector('.reco-section')?.dataset.in))
await shot(h, 'home-reco.png')

await browser.close()
spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
