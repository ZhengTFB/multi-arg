import type { Item, Member, Room } from './types'

export interface RoomState {
  room: Room
  members: Member[]
  items: Item[]
  member: Member
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `http_${res.status}`)
  }
  return (await res.json()) as T
}

export function createRoom(input: {
  url: string
  modules: string[]
  name: string
  title?: string
}): Promise<RoomState> {
  return post<RoomState>('/api/room', input)
}

export function joinRoom(id: string, name: string): Promise<RoomState> {
  return post<RoomState>(`/api/room/${id}/join`, { name })
}

export async function fetchState(id: string, memberId: string): Promise<RoomState | null> {
  const res = await fetch(`/api/room/${id}/state?member=${encodeURIComponent(memberId)}`)
  if (res.ok) return (await res.json()) as RoomState
  if (res.status === 404) return null
  throw new Error(`http_${res.status}`)
}

export interface ServerEvents {
  onState: (state: { room: Room; members: Member[]; items: Item[] }) => void
  onItem: (item: Item) => void
  onMember: (member: Member) => void
  onStatus: (status: 'ok' | 'off') => void
  onError: (code: string) => void
}

/** 房间长连接：断线自动重连，重连后重新要一次快照。 */
export class RoomSocket {
  private ws: WebSocket | null = null
  private timer: number | null = null
  private retry = 0
  private closed = false

  constructor(
    private roomId: string,
    private memberId: string,
    private events: ServerEvents,
  ) {
    this.connect()
  }

  private connect = () => {
    if (this.closed) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${location.host}/ws?room=${this.roomId}&member=${this.memberId}`
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.retry = 0
      this.events.onStatus('ok')
    }

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(String(event.data))
      } catch {
        return
      }

      if (msg.t === 'snapshot') {
        this.events.onState({
          room: msg.room as Room,
          members: msg.members as Member[],
          items: msg.items as Item[],
        })
        return
      }
      if (msg.t === 'item.add' || msg.t === 'item.patch') {
        this.events.onItem(msg.item as Item)
        return
      }
      if (msg.t === 'member.update') {
        this.events.onMember(msg.member as Member)
        return
      }
      if (msg.t === 'error') {
        this.events.onError(String(msg.code ?? 'error'))
      }
    }

    ws.onclose = (event) => {
      this.events.onStatus('off')
      if (this.closed || event.code === 4004) return
      const wait = Math.min(1000 * 2 ** this.retry, 15000)
      this.retry += 1
      this.timer = window.setTimeout(this.connect, wait)
    }

    ws.onerror = () => ws.close()
  }

  send(payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload))
  }

  close() {
    this.closed = true
    if (this.timer) window.clearTimeout(this.timer)
    this.ws?.close()
  }
}
