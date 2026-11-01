import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36'
const BASE = 'https://miyeji.cn'
const OUT_DIR = path.join(process.cwd(), 'public', 'covers', 'miyeji')

const get = (url, extra = {}) =>
  fetch(url, { headers: { 'user-agent': UA, ...extra }, redirect: 'follow' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function listSlugs() {
  const pages = ['/games', '/games?filters=1', '/explore', '/games?page=2']
  const set = new Map()
  for (const page of pages) {
    try {
      const res = await get(BASE + page)
      const html = await res.text()
      for (const m of html.matchAll(/href="(\/games\/[a-z0-9-]+)"/gi)) set.set(m[1], true)
    } catch (err) {
      console.log('list fail', page, String(err).slice(0, 60))
    }
    await sleep(400)
  }
  return [...set.keys()]
}

function meta(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`,
    'i',
  )
  return html.match(re)?.[1] ?? ''
}

function externalLink(html) {
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1])
  const skip = /miyeji\.cn|beian\.miit|github\.com\/|beian|weixin|qq\.com|zhihu|bilibili|twitter|x\.com|discord|youtube|steam|taptap/i
  return links.find((u) => !skip.test(u)) ?? ''
}

function blocking(res) {
  const xfo = res.headers.get('x-frame-options') ?? ''
  const csp = res.headers.get('content-security-policy') ?? ''
  if (/deny|sameorigin/i.test(xfo)) return `xfo:${xfo}`
  if (/frame-ancestors[^;]*(none|'self')/i.test(csp)) return 'csp:frame-ancestors'
  return ''
}

const slugs = await listSlugs()
console.log('slugs', slugs.length)

const picked = []
for (const slug of slugs) {
  if (picked.length >= 26) break
  try {
    const res = await get(BASE + slug)
    if (!res.ok) continue
    const html = await res.text()
    const title = (meta(html, 'og:title') || html.match(/<h1[^>]*>([^<]+)</)?.[1] || slug)
      .replace(/\s*[-|｜].*谜页集.*$/, '')
      .trim()
    const cover = meta(html, 'og:image')
    const url = externalLink(html)
    if (!url) continue

    const target = await get(url).catch(() => null)
    if (!target || !target.ok) continue
    const block = blocking(target)
    if (block) {
      console.log('skip(block)', slug, block)
      continue
    }

    picked.push({ slug, title, url, cover })
    console.log('ok', slug, title, url)
  } catch (err) {
    console.log('fail', slug, String(err).slice(0, 50))
  }
  await sleep(250)
}

console.log('picked', picked.length)

await mkdir(OUT_DIR, { recursive: true })
const items = []
let i = 0
for (const p of picked) {
  i += 1
  const file = `miyeji-${String(i).padStart(2, '0')}.webp`
  try {
    if (p.cover.startsWith('http')) {
      const img = await get(p.cover)
      const buf = Buffer.from(await img.arrayBuffer())
      await writeFile(path.join(OUT_DIR, file), buf)
      items.push({ slug: p.slug, title: p.title, url: p.url, cover: `/covers/miyeji/${file}` })
    } else {
      items.push({ slug: p.slug, title: p.title, url: p.url, cover: '' })
    }
  } catch {
    items.push({ slug: p.slug, title: p.title, url: p.url, cover: '' })
  }
  await sleep(120)
}

await writeFile(
  path.join(process.cwd(), 'scripts', 'miyeji-items.json'),
  JSON.stringify({ items }, null, 2),
  'utf8',
)
console.log('written', items.length, 'covers ->', OUT_DIR)
