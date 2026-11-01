import { randomUUID, randomInt } from 'node:crypto'
import { q, DAY, rowToItem, rowToMember, rowToRoom } from './db.mjs'

export const COLORS = [
  '#4A5D3A',
  '#8B5A2B',
  '#3E5C76',
  '#6B4E71',
  '#8B9D77',
  '#B07050',
  '#5C4033',
  '#7A8450',
  '#A4763F',
  '#4F5D75',
]

const MAX_NAME = 12

function digits4() {
  return String(randomInt(0, 10000)).padStart(4, '0')
}

function cleanName(raw) {
  const name = String(raw ?? '').trim().slice(0, MAX_NAME)
  return name || '访客'
}

function bad(res, code, status = 400) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: code }))
}

function ok(res, payload, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

export async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

// 按 IP 限流：一分钟 30 次进房请求，够用又能挡住扫号脚本
const buckets = new Map()
function allow(ip) {
  const now = Date.now()
  const list = (buckets.get(ip) ?? []).filter((t) => now - t < 60_000)
  list.push(now)
  buckets.set(ip, list)
  if (buckets.size > 5000) buckets.clear()
  return list.length <= 30
}

function makeMember(roomId, name, index) {
  const now = Date.now()
  const member = {
    id: randomUUID(),
    name: cleanName(name),
    color: COLORS[index % COLORS.length],
    lastSeen: now,
  }
  q.insertMember.run(member.id, roomId, member.name, member.color, now, now)
  return member
}

function roomPayload(row) {
  const room = rowToRoom(row)
  const members = q.membersByRoom.all(row.id).map(rowToMember)
  const items = q.itemsByRoom.all(row.id).map(rowToItem)
  return { room, members, items }
}

export async function handleApi(req, res, url) {
  const ip = req.socket.remoteAddress ?? 'unknown'
  const pathname = url.pathname

  if (req.method === 'GET' && pathname === '/api/health') {
    ok(res, { ok: true, at: Date.now() })
    return true
  }

  if (req.method === 'POST' && pathname === '/api/room') {
    if (!allow(ip)) return bad(res, 'rate_limited', 429), true
    const body = await readJson(req)
    const raw = String(body.url ?? '').trim()
    let gameUrl
    try {
      const parsed = new URL(raw)
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad protocol')
      gameUrl = parsed.href
    } catch {
      return bad(res, 'bad_url'), true
    }

    const modules = Array.isArray(body.modules) && body.modules.length ? body.modules : ['note']
    const now = Date.now()

    let id = digits4()
    for (let i = 0; i < 40 && q.roomById.get(id); i += 1) id = digits4()
    if (q.roomById.get(id)) return bad(res, 'room_full', 503), true

    const title = String(body.title ?? '').trim() || safeHost(gameUrl)
    q.insertRoom.run(id, gameUrl, title, JSON.stringify(modules), now, now + 37 * DAY)

    const row = q.roomById.get(id)
    const member = makeMember(id, body.name, 0)
    return ok(res, { ...roomPayload(row), member }), true
  }

  const joinMatch = pathname.match(/^\/api\/room\/(\d{4})\/join$/)
  if (req.method === 'POST' && joinMatch) {
    if (!allow(ip)) return bad(res, 'rate_limited', 429), true
    const row = q.roomById.get(joinMatch[1])
    if (!row) return bad(res, 'not_found', 404), true

    const body = await readJson(req)
    const index = q.membersByRoom.all(row.id).length
    const member = makeMember(row.id, body.name, index)
    return ok(res, { ...roomPayload(row), member }), true
  }

  const infoMatch = pathname.match(/^\/api\/room\/(\d{4})$/)
  if (req.method === 'GET' && infoMatch) {
    const row = q.roomById.get(infoMatch[1])
    if (!row) return bad(res, 'not_found', 404), true
    return ok(res, { room: rowToRoom(row), online: q.membersByRoom.all(row.id).length }), true
  }

  // 刷新页面时用本地记住的 memberId 换回整份状态，不用重新加入
  const stateMatch = pathname.match(/^\/api\/room\/(\d{4})\/state$/)
  if (req.method === 'GET' && stateMatch) {
    const row = q.roomById.get(stateMatch[1])
    if (!row) return bad(res, 'not_found', 404), true

    const memberId = url.searchParams.get('member') ?? ''
    const member = q.memberById.get(memberId)
    if (!member || member.room_id !== row.id) return bad(res, 'member_missing', 404), true

    return ok(res, { ...roomPayload(row), member: rowToMember(member) }), true
  }

  return false
}

export function safeHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return '游戏'
  }
}

export { roomPayload, makeMember }
