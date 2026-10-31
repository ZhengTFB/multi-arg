/** 02 §2.2：固定 10 色，按加入顺序取，不随机。 */
export const MEMBER_COLORS = [
  '#07444C',
  '#8C4A2F',
  '#3F5B8C',
  '#6B4A78',
  '#2F6B4A',
  '#8C6B2F',
  '#4A4A4A',
  '#7A2F3F',
  '#2F6B72',
  '#5A5A2F',
]

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

export function initial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1)
}
