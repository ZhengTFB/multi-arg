import { useMemo } from 'react'
import type { Item, Member } from '../lib/types'
import { LinkCard } from './LinkCard'
import { NoteRow } from './NoteRow'

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

const FEED_TYPES = new Set(['link', 'note', 'system'])

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

  const list = useMemo(() => {
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

    const tops = base.filter((i) => !i.refId)
    const comments = new Map<string, Item[]>()
    for (const item of base) {
      if (!item.refId) continue
      const bucket = comments.get(item.refId)
      if (bucket) bucket.push(item)
      else comments.set(item.refId, [item])
    }
    return { tops, comments }
  }, [items, mode, memberFilter, starOnly, query, meId])

  if (list.tops.length === 0) {
    return (
      <div className="feed">
        <p className="feed-empty">{mode === 'note' ? '想到什么写什么。' : '还没有人发东西。'}</p>
      </div>
    )
  }

  return (
    <div className="feed">
      {list.tops.map((item) => {
        const author = byId.get(item.authorId)
        if (item.type === 'system') {
          return (
            <div key={item.id} className="sys-row">
              {item.text}
            </div>
          )
        }
        const kids = list.comments.get(item.id) ?? []
        return (
          <div key={item.id}>
            {item.type === 'link' ? (
              <LinkCard
                item={item}
                author={author}
                seen={seen.has(item.id)}
                onOpen={() => onOpenLink(item)}
              />
            ) : (
              <NoteRow
                item={item}
                author={author}
                mine={item.authorId === meId}
                onStar={() => onStar(item)}
                onExclude={() => onExclude(item)}
              />
            )}
            {kids.map((kid) => (
              <NoteRow
                key={kid.id}
                item={kid}
                author={byId.get(kid.authorId)}
                comment
                mine={kid.authorId === meId}
                onStar={() => onStar(kid)}
                onExclude={() => onExclude(kid)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
