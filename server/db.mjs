import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DATA_DIR = process.env.ARG_DATA_DIR || path.join(ROOT, '.data')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(path.join(DATA_DIR, 'arg.db'))

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    game_url TEXT NOT NULL,
    title TEXT NOT NULL,
    modules TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    current_title TEXT,
    current_url TEXT,
    current_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    starred INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    ref_id TEXT,
    data TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_room ON items(room_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_members_room ON members(room_id, last_seen);
`)

/** 文档 02 §8：7 天到期只读、第 37 天清空 */
export const DAY = 24 * 60 * 60 * 1000

export const q = {
  roomById: db.prepare('SELECT * FROM rooms WHERE id = ?'),
  roomByTitle: db.prepare('SELECT id FROM rooms WHERE game_url = ? AND created_at > ?'),
  insertRoom: db.prepare(
    'INSERT INTO rooms (id, game_url, title, modules, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
  ),
  deleteRoom: db.prepare('DELETE FROM rooms WHERE id = ?'),
  expiredRooms: db.prepare('SELECT id FROM rooms WHERE created_at < ?'),

  memberById: db.prepare('SELECT * FROM members WHERE id = ?'),
  membersByRoom: db.prepare('SELECT * FROM members WHERE room_id = ? ORDER BY created_at ASC'),
  insertMember: db.prepare(
    'INSERT INTO members (id, room_id, name, color, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)',
  ),
  touchMember: db.prepare('UPDATE members SET last_seen = ? WHERE id = ?'),
  setPresence: db.prepare(
    'UPDATE members SET last_seen = ?, current_title = ?, current_url = ?, current_at = ? WHERE id = ?',
  ),

  itemsByRoom: db.prepare('SELECT * FROM items WHERE room_id = ? ORDER BY created_at ASC'),
  itemById: db.prepare('SELECT * FROM items WHERE id = ?'),
  insertItem: db.prepare(
    'INSERT INTO items (id, room_id, author_id, type, created_at, starred, status, ref_id, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ),
  updateItem: db.prepare('UPDATE items SET starred = ?, status = ?, data = ? WHERE id = ?'),
}

export function rowToItem(row) {
  const parsed = JSON.parse(row.data)
  return {
    ...parsed,
    id: row.id,
    authorId: row.author_id,
    type: row.type,
    createdAt: row.created_at,
    starred: !!row.starred,
    status: row.status,
    ...(row.ref_id ? { refId: row.ref_id } : {}),
  }
}

export function rowToMember(row) {
  const base = {
    id: row.id,
    name: row.name,
    color: row.color,
    joinedAt: row.created_at,
    lastSeen: row.last_seen,
  }
  if (row.current_at && row.current_title) {
    return { ...base, current: { title: row.current_title, url: row.current_url, at: row.current_at } }
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
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    readOnly: Date.now() - row.created_at > 7 * DAY,
  }
}

const PURGE = 37 * DAY
export function purgeExpired() {
  for (const row of q.expiredRooms.all(Date.now() - PURGE)) {
    q.deleteRoom.run(row.id)
  }
}
