import WebSocket from 'ws'

const BASE = 'http://127.0.0.1:8787'

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

const created = await post('/api/room', {
  url: 'https://mminghuo.github.io/forum/',
  modules: ['note', 'keyword', 'person', 'secret', 'timeline'],
  name: '陈默',
})
console.log('room', created.room.id, 'member', created.member.name)

const joined = await post(`/api/room/${created.room.id}/join`, { name: '小林' })
console.log('joined as', joined.member.name, 'members', joined.members.length)

const ws1 = new WebSocket(`ws://127.0.0.1:8787/ws?room=${created.room.id}&member=${created.member.id}`)
const ws2 = new WebSocket(`ws://127.0.0.1:8787/ws?room=${created.room.id}&member=${joined.member.id}`)

const events = { ws1: [], ws2: [] }
for (const [key, ws] of [['ws1', ws1], ['ws2', ws2]]) {
  ws.on('message', (raw) => events[key].push(JSON.parse(raw.toString())))
}

await new Promise((r) => setTimeout(r, 500))
console.log('snapshots', events.ws1.filter((e) => e.t === 'snapshot').length, events.ws2.filter((e) => e.t === 'snapshot').length)

ws1.send(JSON.stringify({ t: 'item.add', item: { type: 'note', text: '第三页右下角有个小字' } }))
await new Promise((r) => setTimeout(r, 400))

const added = events.ws2.find((e) => e.t === 'item.add')
console.log('broadcast to other member:', added?.item?.text, '| author is me:', added?.item?.authorId === created.member.id)

ws1.send(JSON.stringify({ t: 'item.patch', id: added.item.id, patch: { starred: true } }))
await new Promise((r) => setTimeout(r, 400))
const patchedSelf = events.ws1.filter((e) => e.t === 'item.patch').at(-1)
const patchedOther = events.ws2.filter((e) => e.t === 'item.patch').at(-1)
console.log('patch self', patchedSelf?.item?.starred, 'other', patchedOther?.item?.starred)

ws2.send(JSON.stringify({ t: 'item.patch', id: added.item.id, patch: { text: 'hack' } }))
await new Promise((r) => setTimeout(r, 300))
console.log('non-owner rejected:', events.ws2.some((e) => e.t === 'error' && e.code === 'not_owner'))

ws1.send(JSON.stringify({ t: 'presence', title: '店内环境', url: 'https://x' }))
await new Promise((r) => setTimeout(r, 300))
const presence = events.ws2.filter((e) => e.t === 'member.update').at(-1)
console.log('presence', presence?.member?.current?.title)

ws1.close()
ws2.close()
