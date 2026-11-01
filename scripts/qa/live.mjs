// 端到端：两个浏览器同房互发、刷新后仍在。先跑 npm run build && npm run server。
import { chromium } from 'playwright'

const BASE = process.env.QA_BASE || 'http://127.0.0.1:8787'

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
const browser = await chromium.launch({ channel: 'msedge' })

async function open(name) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'zh-CN' })
  await ctx.addInitScript((n) => {
    // 界面里的值都是 JSON 存的，这里也必须 stringify
    localStorage.setItem('arg:name', JSON.stringify(n))
    localStorage.setItem('arg:coach', 'true')
  }, name)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/r/${roomId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.room', { timeout: 15000 })
  await page.waitForSelector('.panel[data-open="true"]', { timeout: 15000 })
  await page.waitForTimeout(600)
  return page
}

const checks = []
const a = await open('陈默')
const b = await open('小林')

checks.push(['两人都在房间里', (await a.locator('.panel-count').innerText()).includes('3 人')])

await a.locator('[data-composer]').fill('第三页右下角有个小字')
await a.locator('[data-composer]').press('Enter')
await b.waitForTimeout(600)
checks.push(['B 收到 A 的消息', (await b.locator('.msg-bubble').filter({ hasText: '第三页右下角' }).count()) === 1])

await b.locator('[data-composer]').fill('我这边也看到了')
await b.locator('[data-composer]').press('Enter')
await a.waitForTimeout(600)
checks.push(['A 收到 B 的回复', (await a.locator('.msg-bubble').filter({ hasText: '我这边也看到了' }).count()) === 1])

await a.reload({ waitUntil: 'domcontentloaded' })
await a.waitForSelector('.room', { timeout: 15000 })
await a.waitForTimeout(700)
checks.push(['刷新后消息还在', (await a.locator('.msg-bubble').filter({ hasText: '第三页右下角' }).count()) === 1])

await browser.close()

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(`房间 ${roomId}，${checks.length - failed}/${checks.length} 通过`)
process.exitCode = failed ? 1 : 0
