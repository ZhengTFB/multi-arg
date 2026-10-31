/** 界面自己的状态用 `arg:` 前缀；`__arg:` 是注入游戏页的存档前缀，两者不要混。 */
const PREFIX = 'arg:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* 隐私模式下写不进去，不影响使用 */
  }
}

export function has(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null
  } catch {
    return false
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* 同上 */
  }
}

/** 每个浏览器一个成员 id，刷新和重连复用，不跟别人共用。 */
export function memberId(roomId: string): string {
  const key = `member:${roomId}`
  const existing = load<string>(key, '')
  if (existing) return existing
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  save(key, id)
  return id
}

export function memberName(roomId: string): string {
  return load<string>(`name:${roomId}`, '')
}

export function setMemberName(roomId: string, name: string): void {
  save(`name:${roomId}`, name)
}
