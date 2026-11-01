export interface Session {
  id: string
  name: string
}

const key = (roomId: string) => `arg:member:${roomId}`

export function loadSession(roomId: string): Session | null {
  try {
    const raw = localStorage.getItem(key(roomId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(roomId: string, session: Session) {
  try {
    localStorage.setItem(key(roomId), JSON.stringify(session))
  } catch {
    /* 隐私模式下写不进去，刷新会重新加入，不影响使用 */
  }
}
