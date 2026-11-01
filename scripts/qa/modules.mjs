// 模块交互：人物连线、时间线拖拽、密码明文
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
await page.waitForSelector('.panel[data-open="true"]', { timeout: 15000 })
await page.waitForTimeout(800)

// —— 人物关系 ——
await page.getByRole('tab', { name: '人物关系' }).click()
await page.waitForTimeout(400)

for (const name of ['老张', '小林']) {
  await page.locator('.fab').click()
  await page.locator('.compose-field').first().fill(name)
  await page.locator('.compose-ok').click()
  await page.waitForTimeout(500)
}
checks.push(['两个人都在图里', (await page.locator('.people-node').count()) === 2])

await page.locator('.people-node').nth(0).click()
await page.locator('.people-node').nth(1).click()
await page.waitForTimeout(300)
checks.push(['点两个人弹出关系卡', (await page.locator('.rel-card').count()) === 1])

await page.locator('.rel-input input').fill('同乡')
await page.keyboard.press('Enter')
await page.waitForTimeout(700)
const edge = (await page.locator('.people-edge-label').first().textContent())?.trim()
checks.push(['关系线带字', edge === '同乡'])

// —— 时间线 ——
await page.getByRole('tab', { name: '时间线' }).click()
await page.waitForTimeout(400)
for (const [at, text] of [
  ['03:58', '灯亮了'],
  ['04:12', '停车'],
]) {
  await page.locator('.fab').click()
  await page.locator('.compose-field').first().fill(at)
  await page.locator('.compose-field').nth(1).fill(text)
  await page.locator('.compose-ok').click()
  await page.waitForTimeout(500)
}
let order = await page.locator('.tl-text').allInnerTexts()
checks.push(['按输入顺序显示', order[0] === '灯亮了' && order[1] === '停车'])

const row2 = await page.locator('.tl-item').nth(1).boundingBox()
const row1 = await page.locator('.tl-item').nth(0).boundingBox()
await page.mouse.move(row2.x + row2.width / 2, row2.y + 10)
await page.mouse.down()
await page.mouse.move(row1.x + row1.width / 2, row1.y + 4, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(900)
order = await page.locator('.tl-text').allInnerTexts()
checks.push(['拖动后顺序变了', order[0] === '停车'])

await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForSelector('.panel[data-open="true"]', { timeout: 15000 })
await page.waitForTimeout(900)
await page.getByRole('tab', { name: '时间线' }).click()
await page.waitForTimeout(600)
order = await page.locator('.tl-text').allInnerTexts()
checks.push(['刷新后顺序还在', order[0] === '停车'])

// —— 密码明文 ——
await page.getByRole('tab', { name: '密码' }).click()
await page.waitForTimeout(400)
await page.locator('.fab').click()
await page.locator('.compose-field').first().fill('值班室')
await page.locator('.compose-field').nth(1).fill('8472')
await page.locator('.compose-ok').click()
await page.waitForTimeout(600)
const pass = await page.locator('.secret-pass').first().innerText()
checks.push(['密码直接显示明文', pass.trim() === '8472'])

await page.screenshot({ path: 'refs/_qa/modules.png' })
await browser.close()

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(`房间 ${created.room.id}，${checks.length - failed}/${checks.length} 通过`)
process.exitCode = failed ? 1 : 0
