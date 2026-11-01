// 聊天不进笔记、笔记能自己写、分享同一页会刷新
import { chromium } from 'playwright'

const BASE = process.env.QA_BASE || 'http://127.0.0.1:8787'
const created = await (
  await fetch(`${BASE}/api/room`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: `${BASE}/mock-game.html`,
      modules: ['note', 'keyword', 'person', 'secret', 'timeline'],
      name: '老周',
      title: '值班表',
    }),
  })
).json()

const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1180, height: 860 }, locale: 'zh-CN' })
await ctx.addInitScript(() => {
  localStorage.setItem('arg:name', JSON.stringify('小林'))
  localStorage.setItem('arg:coach', 'true')
})
const page = await ctx.newPage()
const checks = []

await page.goto(`${BASE}/r/${created.room.id}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.panel[data-open="true"]', { timeout: 20000 })
await page.waitForTimeout(900)

await page.locator('[data-composer]').fill('这是一句聊天')
await page.locator('[data-composer]').press('Enter')
await page.waitForTimeout(1200)
checks.push(['聊天里能看到', (await page.locator('.msg-bubble').filter({ hasText: '这是一句聊天' }).count()) === 1])

await page.getByRole('tab', { name: '笔记' }).click()
await page.waitForTimeout(800)
checks.push(['聊天没有混进笔记', (await page.locator('.note-line').filter({ hasText: '这是一句聊天' }).count()) === 0])

await page.locator('.note-add input').fill('这是笔记')
await page.locator('.note-add button').click()
await page.waitForTimeout(1200)
checks.push(['笔记能自己写', (await page.locator('.note-line').filter({ hasText: '这是笔记' }).count()) === 1])

// 分享当前页 → 自己点回来应触发重载
await page.getByRole('tab', { name: '聊天' }).click()
await page.waitForTimeout(400)
await page.locator('.share-cta').click()
await page.waitForTimeout(1200)
const cards = await page.locator('.link-title').count()
checks.push(['分享后出现链接卡', cards >= 1])
await page.locator('.link-title').last().click()
await page.waitForTimeout(1200)
checks.push(['点同一地址仍在房间内', page.url().includes('/r/')])

await browser.close()
let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(`房间 ${created.room.id}，${checks.length - failed}/${checks.length} 通过`)
process.exitCode = failed ? 1 : 0
