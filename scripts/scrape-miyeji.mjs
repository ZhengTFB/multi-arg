const res = await fetch('https://miyeji.cn', {
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
})
const html = await res.text()
console.log('status', res.status, 'len', html.length)

const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi)]
  .map((m) => ({ href: m[1], inner: m[2] }))
  .filter((x) => /^https?:\/\//.test(x.href))
const uniq = new Map()
for (const l of links) if (!uniq.has(l.href)) uniq.set(l.href, l)

console.log('external links', links.length, 'uniq', uniq.size)
for (const [href] of [...uniq].slice(0, 30)) console.log(href)

const imgs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1])
console.log('imgs', imgs.length)
for (const src of imgs.slice(0, 15)) console.log(src)

const og = [...html.matchAll(/<meta\b[^>]*(?:property|name)="(og:image|og:title)"[^>]*content="([^"]+)"/gi)]
console.log('og', JSON.stringify(og.slice(0, 6).map((m) => [m[1], m[2]])))
