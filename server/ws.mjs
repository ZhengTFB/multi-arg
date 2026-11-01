import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { q, DAY, rowToItem, rowToMember, rowToRoom } from './db.mjs'

/** roomId -> Set<ws> */
const rooms = new Map()

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload))
}

function broadcast(roomId, payload, except) {
  const set = rooms.get(roomId)
  if (!set) return
  for (const client of set) {
    if (client !== except) send(client, payload)
  }
}

async function roomState(roomId) {
  const room = await q.roomById(roomId)
  const members = await q.membersByRoom(roomId)
  const items = await q.itemsByRoom(roomId)
  return {
    room: rowToRoom(room),
    members: members.map(rowToMember),
    items: items.map(rowToItem),
  }
}

const writable = new Set([
  'text',
  'title',
  'url',
  'pageUrl',
  'keyword',
  'result',
  'secret',
  'person',
  'relations',
  'event',
  'mentions',
  'starred',
  'status',
  'order',
])

export function attachWs(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '/ws', 'http://localhost')
    const roomId = url.searchParams.get('room') ?? ''
    const memberId = url.searchParams.get('member') ?? ''

    const room = await q.roomById(roomId)
    const member = await q.memberById(memberId)
    if (!room || !member || member.room_id !== roomId) {
      ws.close(4004, 'not found')
      return
    }

    ws.roomId = roomId
    ws.memberId = memberId
    ws.isAlive = true

    const set = rooms.get(roomId) ?? new Set()
    set.add(ws)
    rooms.set(roomId, set)

    await q.touchMember(Date.now(), memberId)

    send(ws, { t: 'snapshot', ...(await roomState(roomId)) })
    broadcast(
      roomId,
      { t: 'member.update', member: rowToMember(await q.memberById(memberId)) },
      ws,
    )

    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }
      handle(ws, msg, roomId, memberId).catch(() => {
        send(ws, { t: 'error', code: 'server' })
      })
    })

    ws.on('close', () => {
      const current = rooms.get(roomId)
      if (!current) return
      current.delete(ws)
      if (!current.size) rooms.delete(roomId)
      q.touchMember(Date.now(), memberId).catch(() => {})
    })

    ws.on('error', () => {
      ws.terminate()
    })
  })

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate()
        continue
      }
      client.isAlive = false
      client.ping()
    }
  }, 30_000)

  wss.on('close', () => clearInterval(heartbeat))

  return wss
}

async function handle(ws, msg, roomId, memberId) {
  const room = await q.roomById(roomId)
  if (!room) return

  const readOnly = Date.now() - Number(room.created_at) > 7 * DAY

  if (msg.t === 'ping') {
    send(ws, { t: 'pong' })
    return
  }

  if (msg.t === 'presence') {
    const now = Date.now()
    const title = typeof msg.title === 'string' ? msg.title.slice(0, 80) : null
    const url = typeof msg.url === 'string' ? msg.url.slice(0, 500) : null
    await q.setPresence(now, title, url, memberId)
    broadcast(roomId, {
      t: 'member.update',
      member: rowToMember(await q.memberById(memberId)),
    })
    return
  }

  if (msg.t === 'item.add') {
    if (readOnly) {
      send(ws, { t: 'error', code: 'readonly', message: '房间已过编辑期，只能看' })
      return
    }
    const input = msg.item ?? {}
    const type = String(input.type ?? 'note')
    if (!['msg', 'link', 'note', 'keyword', 'secret', 'person', 'event', 'system'].includes(type)) {
      send(ws, { t: 'error', code: 'bad_type' })
      return
    }

    const item = {
      ...input,
      id: randomUUID(),
      type,
      authorId: memberId,
      createdAt: Date.now(),
    }

    const data = { ...item }
    delete data.id
    delete data.authorId
    delete data.type
    delete data.createdAt
    delete data.starred
    delete data.status

    await q.insertItem({
      id: item.id,
      room_id: roomId,
      author_id: memberId,
      type,
      created_at: item.createdAt,
      starred: item.starred ? 1 : 0,
      status: item.status ?? 'open',
      ref_id: item.refId ?? null,
      data: JSON.stringify(data),
    })

    const stored = rowToItem(await q.itemById(item.id))
    send(ws, { t: 'item.add', item: stored, ack: input.ack })
    broadcast(roomId, { t: 'item.add', item: stored }, ws)
    return
  }

  if (msg.t === 'item.patch') {
    if (readOnly) {
      send(ws, { t: 'error', code: 'readonly', message: '房间已过编辑期，只能看' })
      return
    }
    const row = await q.itemById(String(msg.id ?? ''))
    if (!row || row.room_id !== roomId) {
      send(ws, { t: 'error', code: 'not_found' })
      return
    }

    const patch = msg.patch ?? {}
    // 时间线的排序是房间级的，谁都可以调；其余字段只有作者能改
    const onlyOrder = Object.keys(patch).every((key) => key === 'order')
    if (row.author_id !== memberId && !onlyOrder) {
      send(ws, { t: 'error', code: 'not_owner' })
      return
    }

    const current = rowToItem(row)
    const next = { ...current }
    for (const [key, value] of Object.entries(patch)) {
      if (writable.has(key)) next[key] = value
    }

    const data = { ...next }
    delete data.id
    delete data.authorId
    delete data.type
    delete data.createdAt
    delete data.starred
    delete data.status

    await q.updateItem({
      id: row.id,
      starred: next.starred ? 1 : 0,
      status: next.status ?? 'open',
      data: JSON.stringify(data),
    })

    const stored = rowToItem(await q.itemById(row.id))
    send(ws, { t: 'item.patch', item: stored })
    broadcast(roomId, { t: 'item.patch', item: stored }, ws)
    return
  }
}
