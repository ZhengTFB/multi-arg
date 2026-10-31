// 四张验收截图。本机 Playwright 要 chromium-1248，实际只装了 1243，所以走系统 Edge。
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const PORT = 5178
const BASE = `http://127.0.0.1:${PORT}`
const OUT = path.join(ROOT, 'docs', 'shots')

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' },
)

async function waitForServer(timeoutMs = 40000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: 'GET' })
      if (res.ok) return
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error('dev server did not start')
}

function stopServer() {
  try {
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      server.kill('SIGTERM')
    }
  } catch {
    /* 收尾失败不影响截图结果 */
  }
}

const ONBOARDED = () => {
  try {
    localStorage.setItem('arg:onboarded', 'true')
  } catch {
    /* 忽略 */
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await waitForServer()

  const browser = await chromium.launch({ channel: 'msedge' })

  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: 'zh-CN',
    })
    const page = await desktop.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(OUT, 'home.png') })
    console.log('home.png')

    await page.goto(
      `${BASE}/setup?u=${encodeURIComponent('https://mminghuo.github.io/forum/')}&preset=lingyi-forum`,
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
    await padPage.goto(`${BASE}/r/8472#demo`, { waitUntil: 'networkidle' })
    await padPage.waitForTimeout(900)
    // 右边缘划一下 → 图标浮出 → 点「流」展开面板
    await padPage.locator('.seam-zone').click({ position: { x: 12, y: 400 } })
    await padPage.waitForTimeout(500)
    await padPage.locator('.rail-btn').nth(1).click()
    await padPage.waitForTimeout(800)
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
    await phonePage.goto(`${BASE}/r/8472#demo`, { waitUntil: 'networkidle' })
    await phonePage.waitForTimeout(900)
    await phonePage.locator('.conveyor').click()
    await phonePage.waitForTimeout(700)
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
  .finally(() => {
    stopServer()
  })
