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

function roomState(roomId) {
  return {
    room: rowToRoom(q.roomById.get(roomId)),
    members: q.membersByRoom.all(roomId).map(rowToMember),
    items: q.itemsByRoom.all(roomId).map(rowToItem),
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
])

export function attachWs(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/ws', 'http://localhost')
    const roomId = url.searchParams.get('room') ?? ''
    const memberId = url.searchParams.get('member') ?? ''

    const room = q.roomById.get(roomId)
    const member = q.memberById.get(memberId)
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

    const now = Date.now()
    q.touchMember.run(now, memberId)

    send(ws, { t: 'snapshot', ...roomState(roomId) })
    broadcast(roomId, { t: 'member.update', member: rowToMember(q.memberById.get(memberId)) }, ws)

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
      handle(ws, msg, roomId, memberId)
    })

    ws.on('close', () => {
      const current = rooms.get(roomId)
      if (!current) return
      current.delete(ws)
      if (!current.size) rooms.delete(roomId)
      q.touchMember.run(Date.now(), memberId)
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

function handle(ws, msg, roomId, memberId) {
  const room = q.roomById.get(roomId)
  if (!room) return

  const readOnly = Date.now() - room.created_at > 7 * DAY

  if (msg.t === 'ping') {
    send(ws, { t: 'pong' })
    return
  }

  if (msg.t === 'presence') {
    const now = Date.now()
    const title = typeof msg.title === 'string' ? msg.title.slice(0, 80) : null
    const url = typeof msg.url === 'string' ? msg.url.slice(0, 500) : null
    q.setPresence.run(now, title, url, now, memberId)
    broadcast(roomId, { t: 'member.update', member: rowToMember(q.memberById.get(memberId)) })
    return
  }

  if (msg.t === 'item.add') {
    if (readOnly) {
      send(ws, { t: 'error', code: 'readonly', message: '房间已过编辑期，只能看' })
      return
    }
    const input = msg.item ?? {}
    const type = String(input.type ?? 'note')
    if (!['link', 'note', 'keyword', 'secret', 'person', 'event', 'system'].includes(type)) {
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

    q.insertItem.run(
      item.id,
      roomId,
      memberId,
      type,
      item.createdAt,
      item.starred ? 1 : 0,
      item.status ?? 'open',
      item.refId ?? null,
      JSON.stringify(data),
    )

    const stored = rowToItem(q.itemById.get(item.id))
    send(ws, { t: 'item.add', item: stored, ack: input.ack })
    broadcast(roomId, { t: 'item.add', item: stored }, ws)
    return
  }

  if (msg.t === 'item.patch') {
    if (readOnly) {
      send(ws, { t: 'error', code: 'readonly', message: '房间已过编辑期，只能看' })
      return
    }
    const row = q.itemById.get(String(msg.id ?? ''))
    if (!row || row.room_id !== roomId) {
      send(ws, { t: 'error', code: 'not_found' })
      return
    }
    if (row.author_id !== memberId) {
      send(ws, { t: 'error', code: 'not_owner' })
      return
    }

    const patch = msg.patch ?? {}
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

    q.updateItem.run(
      next.starred ? 1 : 0,
      next.status ?? 'open',
      JSON.stringify(data),
      row.id,
    )

    const stored = rowToItem(q.itemById.get(row.id))
    send(ws, { t: 'item.patch', item: stored })
    broadcast(roomId, { t: 'item.patch', item: stored }, ws)
    return
  }
}
