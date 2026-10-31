import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5210'
const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/?shot=1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.locator('.scroll-cue').click()
await page.waitForTimeout(1100)
console.log('reco in:', await page.evaluate(() => document.querySelector('.reco-section')?.dataset.in))
console.log(
  'scrollTop:',
  await page.evaluate(() => Math.round(document.querySelector('.home-scroll').scrollTop)),
)
await page.screenshot({ path: 'refs/_qa/reco.png' })

await page.goto(`${BASE}/r/8472?shot=1#demo`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
console.log('float:', await page.locator('.float-entry').count())
await page.screenshot({ path: 'refs/_qa/prod-room.png' })

await browser.close()
