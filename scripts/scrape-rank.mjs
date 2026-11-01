import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36'
const BASE = 'https://miyeji.cn'
const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'public', 'covers', 'rank')
const NEED = 20

const get = (url, extra = {}) =>
  fetch(url, { headers: { 'user-agent': UA, ...extra }, redirect: 'follow' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function candidates() {
  const pages = ['/leaderboards', '/leaderboards?period=all', '/explore', '/games?sort=hot']
  const order = []
  const seen = new Set()
  for (const page of pages) {
    try {
      const res = await get(BASE + page)
      const html = await res.text()
      for (const m of html.matchAll(/href="(\/games\/[a-z0-9-]+)"/gi)) {
        const slug = m[1]
        if (!seen.has(slug)) {
          seen.add(slug)
          order.push(slug)
        }
      }
      console.log(page, '->', order.length)
    } catch (err) {
      console.log('fail', page, String(err).slice(0, 50))
    }
    await sleep(400)
  }
  return order
}

const meta = (html, prop) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`, 'i')
  return html.match(re)?.[1] ?? ''
}

function external(html) {
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1])
  const skip = /miyeji\.cn|beian\.miit|weixin\.qq|xiaohongshu|zhihu|bilibili|twitter|x\.com|discord|youtube|steam|taptap|github\.com\/ZhengTFB/i
  return links.find((u) => !skip.test(u)) ?? ''
}

function blocked(res) {
  const xfo = res.headers.get('x-frame-options') ?? ''
  const csp = res.headers.get('content-security-policy') ?? ''
  if (/deny|sameorigin/i.test(xfo)) return xfo
  if (/frame-ancestors[^;]*(none|'self')/i.test(csp)) return 'csp'
  return ''
}

const slugs = await candidates()
console.log('candidates', slugs.length)

await mkdir(OUT_DIR, { recursive: true })
const items = []
let index = 0

for (const slug of slugs) {
  if (items.length >= NEED) break
  try {
    const res = await get(BASE + slug)
    if (!res.ok) continue
    const html = await res.text()
    const title = (meta(html, 'og:title') || html.match(/<h1[^>]*>([^<]+)</)?.[1] || slug)
      .replace(/\s*[-|｜].*谜页集.*$/, '')
      .trim()
    const cover = meta(html, 'og:image')
    const url = external(html)
    if (!url) continue

    const target = await get(url).catch(() => null)
    if (!target || !target.ok) continue
    const why = blocked(target)
    if (why) {
      console.log('skip', slug, why)
      continue
    }

    index += 1
    let coverPath = ''
    if (cover) {
      try {
        const img = await get(cover.startsWith('http') ? cover : BASE + cover)
        const buf = Buffer.from(await img.arrayBuffer())
        const file = `rank-${String(index).padStart(2, '0')}.webp`
        await writeFile(path.join(OUT_DIR, file), buf)
        coverPath = `/covers/rank/${file}`
      } catch {
        coverPath = ''
      }
    }

    items.push({
      slug: slug.replace('/games/', ''),
      title,
      author: '',
      url,
      cover: coverPath,
      minutes: null,
      hasSearch: false,
      searchParam: '',
      embeddable: true,
      note: '谜页集排行榜收录，已确认可被 iframe 嵌入。',
    })
    console.log(index, title, '->', url)
  } catch (err) {
    console.log('fail', slug, String(err).slice(0, 40))
  }
  await sleep(200)
}

if (items.length) {
  await writeFile(
    path.join(ROOT, 'games.json'),
    `${JSON.stringify({ items }, null, 2)}\n`,
    'utf8',
  )
  console.log('games.json written with', items.length, 'items')
} else {
  console.log('nothing picked, keep old games.json')
}
console.log('covers dir exists:', existsSync(OUT_DIR))
