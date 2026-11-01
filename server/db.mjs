import { createClient } from '@libsql/client'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DATA_DIR = process.env.ARG_DATA_DIR || path.join(ROOT, '.data')

mkdirSync(DATA_DIR, { recursive: true })

const fileUrl = `file:${path.join(DATA_DIR, 'arg.db').replace(/\\/g, '/')}`
// 两个变量都齐了才连 Turso，缺一个就退回本地文件，免得线上因为少了 token 起不来
const useTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
const url = useTurso ? process.env.TURSO_DATABASE_URL : fileUrl
const authToken = useTurso ? process.env.TURSO_AUTH_TOKEN : undefined

export const db = createClient(authToken ? { url, authToken } : { url })
export const dbKind = useTurso ? 'turso' : 'local-sqlite'

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    game_url TEXT NOT NULL,
    title TEXT NOT NULL,
    modules TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    current_title TEXT,
    current_url TEXT,
    current_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    starred INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    ref_id TEXT,
    data TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_items_room ON items(room_id, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_members_room ON members(room_id, last_seen)',
]

export async function initDb() {
  await db.batch(SCHEMA, 'write')
}

/** 文档 02 §8：7 天到期只读、第 37 天清空 */
export const DAY = 24 * 60 * 60 * 1000

const one = async (sql, args = []) => {
  const res = await db.execute({ sql, args })
  return res.rows[0] ?? null
}

const all = async (sql, args = []) => {
  const res = await db.execute({ sql, args })
  return res.rows
}

export const q = {
  roomById: (id) => one('SELECT * FROM rooms WHERE id = ?', [id]),
  insertRoom: (room) =>
    db.execute({
      sql: 'INSERT INTO rooms (id, game_url, title, modules, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [room.id, room.game_url, room.title, room.modules, room.created_at, room.expires_at],
    }),
  deleteRoom: (id) => db.execute({ sql: 'DELETE FROM rooms WHERE id = ?', args: [id] }),
  expiredRooms: (cutoff) => all('SELECT id FROM rooms WHERE created_at < ?', [cutoff]),

  memberById: (id) => one('SELECT * FROM members WHERE id = ?', [id]),
  membersByRoom: (roomId) =>
    all('SELECT * FROM members WHERE room_id = ? ORDER BY created_at ASC', [roomId]),
  insertMember: (m) =>
    db.execute({
      sql: 'INSERT INTO members (id, room_id, name, color, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)',
      args: [m.id, m.room_id, m.name, m.color, m.created_at, m.last_seen],
    }),
  touchMember: (at, id) =>
    db.execute({ sql: 'UPDATE members SET last_seen = ? WHERE id = ?', args: [at, id] }),
  setPresence: (at, title, url, id) =>
    db.execute({
      sql: 'UPDATE members SET last_seen = ?, current_title = ?, current_url = ?, current_at = ? WHERE id = ?',
      args: [at, title, url, at, id],
    }),

  itemsByRoom: (roomId) =>
    all('SELECT * FROM items WHERE room_id = ? ORDER BY created_at ASC', [roomId]),
  itemById: (id) => one('SELECT * FROM items WHERE id = ?', [id]),
  insertItem: (item) =>
    db.execute({
      sql: 'INSERT INTO items (id, room_id, author_id, type, created_at, starred, status, ref_id, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        item.id,
        item.room_id,
        item.author_id,
        item.type,
        item.created_at,
        item.starred,
        item.status,
        item.ref_id,
        item.data,
      ],
    }),
  updateItem: (item) =>
    db.execute({
      sql: 'UPDATE items SET starred = ?, status = ?, data = ? WHERE id = ?',
      args: [item.starred, item.status, item.data, item.id],
    }),
}

export function rowToItem(row) {
  const parsed = JSON.parse(row.data)
  return {
    ...parsed,
    id: row.id,
    authorId: row.author_id,
    type: row.type,
    createdAt: Number(row.created_at),
    starred: !!Number(row.starred),
    status: row.status,
    ...(row.ref_id ? { refId: row.ref_id } : {}),
  }
}

export function rowToMember(row) {
  const base = {
    id: row.id,
    name: row.name,
    color: row.color,
    joinedAt: Number(row.created_at),
    lastSeen: Number(row.last_seen),
  }
  if (row.current_at && row.current_title) {
    return {
      ...base,
      current: { title: row.current_title, url: row.current_url ?? '', at: Number(row.current_at) },
    }
  }
  return base
}

export function rowToRoom(row) {
  let origin = ''
  try {
    origin = new URL(row.game_url).origin
  } catch {
    origin = ''
  }
  return {
    id: row.id,
    game: {
      url: row.game_url,
      origin,
      title: row.title,
      proxy: true,
      embeddable: true,
      hasSearch: false,
      searchParam: 'q',
    },
    modules: JSON.parse(row.modules),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
    readOnly: Date.now() - Number(row.created_at) > 7 * DAY,
  }
}

const PURGE = 37 * DAY
export async function purgeExpired() {
  const rows = await q.expiredRooms(Date.now() - PURGE)
  for (const row of rows) await q.deleteRoom(row.id)
}
