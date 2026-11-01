// 后端冒烟：建房 → 双人进房 → 广播 → 越权拦截 → presence。先起好 npm run server。
import WebSocket from 'ws'

const BASE = process.env.QA_BASE || 'http://127.0.0.1:8787'
const WS = BASE.replace(/^http/, 'ws')

const post = async (path, body) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

const open = (roomId, memberId) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}/ws?room=${roomId}&member=${memberId}`)
    const inbox = []
    ws.on('message', (raw) => inbox.push(JSON.parse(raw.toString())))
    ws.once('open', () => resolve({ ws, inbox }))
    ws.once('error', reject)
  })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const created = await post('/api/room', {
  url: 'https://mminghuo.github.io/forum/',
  modules: ['note', 'keyword'],
  name: '陈默',
})
const roomId = created.room.id
const joined = await post(`/api/room/${roomId}/join`, { name: '小林' })

const a = await open(roomId, created.member.id)
const b = await open(roomId, joined.member.id)
await wait(900)

const checks = []
checks.push(['双方各拿到快照', [a, b].every((c) => c.inbox.some((e) => e.t === 'snapshot'))])

a.ws.send(JSON.stringify({ t: 'item.add', item: { type: 'note', text: '第三页右下角有个小字' } }))
await wait(1500)
const added = b.inbox.find((e) => e.t === 'item.add')
checks.push(['A 发的消息广播给 B', added?.item?.text === '第三页右下角有个小字'])
checks.push(['服务端补了作者', added?.item?.authorId === created.member.id])

a.ws.send(JSON.stringify({ t: 'item.patch', id: added.item.id, patch: { starred: true } }))
await wait(900)
checks.push([
  '星标同步到双方',
  [a, b].every((c) => c.inbox.filter((e) => e.t === 'item.patch').at(-1)?.item?.starred === true),
])

b.ws.send(JSON.stringify({ t: 'item.patch', id: added.item.id, patch: { text: 'hack' } }))
await wait(900)
checks.push(['非作者改不动', b.inbox.some((e) => e.t === 'error' && e.code === 'not_owner')])

a.ws.send(JSON.stringify({ t: 'presence', title: '店内环境', url: 'https://x' }))
await wait(900)
checks.push(['presence 能收到', b.inbox.filter((e) => e.t === 'member.update').at(-1)?.member?.current?.title === '店内环境'])

a.ws.close()
b.ws.close()

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(`房间 ${roomId}，${checks.length - failed}/${checks.length} 通过`)
process.exitCode = failed ? 1 : 0
