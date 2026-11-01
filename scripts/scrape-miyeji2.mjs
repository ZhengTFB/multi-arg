const res = await fetch('https://miyeji.cn', {
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
})
const html = await res.text()

const all = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1])
const uniq = [...new Set(all)]
console.log('hrefs', all.length, 'uniq', uniq.length)
console.log(uniq.slice(0, 40).join('\n'))

const idx = html.indexOf('/uploads/covers/thumbs/')
console.log('--- 卡片片段 ---')
console.log(html.slice(Math.max(0, idx - 600), idx + 400).replace(/\s+/g, ' '))

const data = [...html.matchAll(/"(\/game\/[^"]+|\/p\/[^"]+|\/play\/[^"]+)"/g)].map((m) => m[1])
console.log('--- 可能的游戏路径', [...new Set(data)].slice(0, 20).join('\n'))
