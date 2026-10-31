import { useMemo } from 'react'
import type { Item, Member } from '../lib/types'
import { LinkCard } from './LinkCard'
import { NoteRow } from './NoteRow'
import { t } from '../lib/copy'
import { monthDay } from '../lib/time'

export type FeedMode = 'feed' | 'note'

interface Props {
  items: Item[]
  members: Member[]
  meId: string
  mode: FeedMode
  memberFilter: string
  starOnly: boolean
  query: string
  seen: Set<string>
  onOpenLink: (item: Item) => void
  onStar: (item: Item) => void
  onExclude: (item: Item) => void
}

type Block =
  | { kind: 'sep'; key: string; label: string }
  | { kind: 'msg'; item: Item; grouped: boolean; kids: Item[] }

const FEED_TYPES = new Set(['link', 'note', 'system'])
const GROUP_MS = 3 * 60_000

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(ts: number): string {
  const now = new Date()
  if (dayKey(ts) === dayKey(now.getTime())) return t('room.today')
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (dayKey(ts) === dayKey(yesterday.getTime())) return t('room.yesterday')
  return monthDay(ts)
}

export function Feed({
  items,
  members,
  meId,
  mode,
  memberFilter,
  starOnly,
  query,
  seen,
  onOpenLink,
  onStar,
  onExclude,
}: Props) {
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const blocks = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = items
      .filter((i) => (mode === 'note' ? i.type === 'note' : FEED_TYPES.has(i.type)))
      .filter((i) => (starOnly ? !!i.starred && i.status !== 'excluded' : true))
      .filter((i) => {
        if (starOnly) return true
        if (memberFilter === 'all') return true
        if (memberFilter === 'me') return i.authorId === meId
        return i.authorId === memberFilter
      })
      .filter((i) => {
        if (!q) return true
        return (i.text ?? '').toLowerCase().includes(q) || (i.title ?? '').toLowerCase().includes(q)
      })
      .sort((a, b) => a.createdAt - b.createdAt)

    const comments = new Map<string, Item[]>()
    for (const item of base) {
      if (!item.refId) continue
      const bucket = comments.get(item.refId)
      if (bucket) bucket.push(item)
      else comments.set(item.refId, [item])
    }

    const topIds = new Set(base.filter((i) => !i.refId).map((i) => i.id))
    const out: Block[] = []
    let prev: Item | null = null

    for (const item of base) {
      // 父消息被过滤掉时，评论当普通消息显示，不然会整条消失
      if (item.refId && topIds.has(item.refId)) continue

      // 只在跨天时插日期，不然同一天里会反复出现「今天」
      const dayBreak = !prev || dayKey(prev.createdAt) !== dayKey(item.createdAt)
      const gap = prev ? item.createdAt - prev.createdAt : Number.POSITIVE_INFINITY
      if (dayBreak) {
        out.push({ kind: 'sep', key: `sep-${item.id}`, label: dayLabel(item.createdAt) })
        prev = null
      }

      const grouped =
        !!prev &&
        prev.type !== 'system' &&
        item.type !== 'system' &&
        prev.authorId === item.authorId &&
        gap < GROUP_MS

      out.push({ kind: 'msg', item, grouped, kids: comments.get(item.id) ?? [] })
      prev = item
    }

    return out
  }, [items, mode, memberFilter, starOnly, query, meId])

  if (blocks.length === 0) {
    return (
      <div className="feed">
        <p className="feed-empty">{mode === 'note' ? t('room.note.empty') : t('room.feed.empty')}</p>
      </div>
    )
  }

  return (
    <div className="feed">
      {blocks.map((block) => {
        if (block.kind === 'sep') {
          return (
            <div className="day-sep" key={block.key}>
              <span>{block.label}</span>
            </div>
          )
        }

        const { item, grouped, kids } = block
        if (item.type === 'system') {
          return (
            <div key={item.id} className="sys-row">
              {item.text}
            </div>
          )
        }

        const author = byId.get(item.authorId)
        const mine = item.authorId === meId

        return (
          <div key={item.id} style={{ display: 'contents' }}>
            {item.type === 'link' ? (
              <LinkCard
                item={item}
                author={author}
                mine={mine}
                grouped={grouped}
                seen={seen.has(item.id)}
                onOpen={() => onOpenLink(item)}
              />
            ) : (
              <NoteRow
                item={item}
                author={author}
                mine={mine}
                grouped={grouped}
                onStar={() => onStar(item)}
                onExclude={() => onExclude(item)}
              />
            )}

            {kids.length > 0 && (
              <div className="thread">
                {kids.map((kid) => (
                  <NoteRow
                    key={kid.id}
                    item={kid}
                    author={byId.get(kid.authorId)}
                    mine={kid.authorId === meId}
                    onStar={() => onStar(kid)}
                    onExclude={() => onExclude(kid)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
