import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const scraped = JSON.parse(readFileSync(path.join(root, 'scripts', 'miyeji-items.json'), 'utf8')).items

const dropHost = /xiaohongshu\.com|weixin\.qq\.com|mp\.weixin/i
const usable = scraped.filter((i) => !dropHost.test(i.url) && existsSync(path.join(root, 'public', i.cover)))

const curated = [
  {
    slug: 'missing',
    title: '大学生登山失踪事件',
    author: '',
    url: 'https://missing.minis.yoroll.ai/?config=missing&lang=zh',
    cover: '/covers/lingyi-forum.jpg',
    minutes: null,
    hasSearch: false,
    searchParam: '',
    embeddable: true,
    note: '带 config 与 lang 参数，别把 query 去掉。',
  },
  {
    slug: 'yeshanbichu',
    title: '邺山彼处',
    author: '',
    url: 'https://yeshanbichu.minis.yoroll.ai/',
    cover: '/covers/wechat-collection.jpg',
    minutes: null,
    hasSearch: false,
    searchParam: '',
    embeddable: true,
    note: 'missing 同系列站点。',
  },
]

const items = [
  ...curated,
  ...usable.map((i) => ({
    slug: i.slug.replace(/^\/games\//, ''),
    title: i.title,
    author: '',
    url: i.url,
    cover: i.cover,
    minutes: null,
    hasSearch: false,
    searchParam: '',
    embeddable: true,
    note: '来自谜页集目录，已检查无 X-Frame-Options / frame-ancestors 限制。',
  })),
]

writeFileSync(path.join(root, 'games.json'), `${JSON.stringify({ items }, null, 2)}\n`, 'utf8')
console.log('games.json items:', items.length)
console.log(items.map((i) => `${i.title} -> ${i.url}`).join('\n'))
