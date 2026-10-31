import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = 'd:/Desktop/多人ARG'
const PORT = 5186
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
const sizes = [
  [1092, 512],
  [1280, 720],
  [1440, 900],
  [1024, 768],
  [820, 1180],
]

for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript(() => localStorage.setItem('arg:onboarded', 'true'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/r/8472?shot=1#demo`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const info = await page.evaluate(() => {
    const de = document.documentElement
    const wide = []
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.right > de.clientWidth + 1) {
        wide.push(`${el.tagName}.${el.className}`.slice(0, 60) + ` right=${Math.round(r.right)}`)
      }
    })
    return {
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      scrollH: de.scrollHeight,
      clientH: de.clientHeight,
      wide: wide.slice(0, 6),
    }
  })
  console.log(`${w}x${h}`, JSON.stringify(info))
  await ctx.close()
}

await browser.close()
spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
