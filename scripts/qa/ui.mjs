// 新界面自检：起名、标签页、地址栏、模块新建、分享标题。先 npm run build && npm run server。
import { chromium } from 'playwright'

const BASE = process.env.QA_BASE || 'http://127.0.0.1:8787'

const created = await (
  await fetch(`${BASE}/api/room`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: `${BASE}/mock-game.html?p=duty`,
      modules: ['note', 'keyword', 'person', 'secret', 'timeline'],
      name: '老周',
      title: '值班表',
    }),
  })
).json()

const roomId = created.room.id
const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'zh-CN' })
const page = await ctx.newPage()
const checks = []

await page.goto(`${BASE}/r/${roomId}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.name-card', { timeout: 15000 })
checks.push(['第一次进房先起名', (await page.locator('.name-card').count()) === 1])

await page.fill('.name-card-input', '小林')
await page.locator('.name-card button[type="submit"]').click()
await page.waitForSelector('.room', { timeout: 15000 })
await page.waitForTimeout(900)

checks.push(['进房后辅助栏默认打开', (await page.locator('.panel[data-open="true"]').count()) === 1])
checks.push(['顶上有地址栏', (await page.locator('.browser-addr').count()) === 1])

// 人物关系：新建 + 拖动
await page.getByRole('tab', { name: '人物关系' }).click()
await page.waitForTimeout(400)
checks.push(['模块页不再有全局搜索框', (await page.locator('[data-search-input]').count()) === 0])

await page.locator('.module-add input').first().fill('老张')
await page.locator('.module-add input').nth(1).fill('值班表签名')
await page.locator('.module-add button').click()
await page.waitForTimeout(700)
checks.push(['人物关系能新建', (await page.locator('.people-node').count()) === 1])

const node = page.locator('.people-node rect').first()
const before = await node.boundingBox()
const g = page.locator('.people-node').first()
const box = await g.boundingBox()
await page.mouse.move(box.x + 30, box.y + 20)
await page.mouse.down()
await page.mouse.move(box.x + 90, box.y + 70, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(300)
const after = await page.locator('.people-node rect').first().boundingBox()
checks.push(['人物节点能拖动', Math.abs(after.x - before.x) > 10])

// 时间线
await page.getByRole('tab', { name: '时间线' }).click()
await page.waitForTimeout(300)
await page.locator('.module-add input').first().fill('03:58')
await page.locator('.module-add input').nth(1).fill('值班室灯亮了')
await page.locator('.module-add button').click()
await page.waitForTimeout(600)
checks.push(['时间线能新建', (await page.locator('.tl-item').count()) === 1])

// 密码
await page.getByRole('tab', { name: '密码' }).click()
await page.waitForTimeout(300)
await page.locator('.module-add input').first().fill('值班室')
await page.locator('.module-add input').nth(1).fill('8472')
await page.locator('.module-add button').click()
await page.waitForTimeout(600)
checks.push(['密码本能新建', (await page.locator('.secret-card').count()) === 1])

// 分享此页：标题取当前标签
await page.locator('.share-cta').click()
await page.waitForTimeout(600)
await page.getByRole('tab', { name: '聊天' }).click()
await page.waitForTimeout(500)
const cardTitle = await page.locator('.link-title').last().innerText()
checks.push(['分享的标题是当前页而不是「店内环境」', cardTitle.includes('值班表')])

// 新标签页按钮
await page.locator('.browser-btn[aria-label="新标签页"]').click()
await page.waitForTimeout(500)
checks.push(['能开新标签页', (await page.locator('.tab').count()) >= 2])

// 点分享卡 → 回到那一页
await page.locator('.tab').first().click()
await page.waitForTimeout(400)
await page.locator('.link-title').last().click()
await page.waitForTimeout(500)
checks.push([
  '点分享卡能回到那一页',
  (await page.locator('.browser-addr-text').innerText()).includes('mock-game.html'),
])

await page.screenshot({ path: 'refs/_qa/ui-tabs.png' })
await browser.close()

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(`房间 ${roomId}，${checks.length - failed}/${checks.length} 通过`)
process.exitCode = failed ? 1 : 0
