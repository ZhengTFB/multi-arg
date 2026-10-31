import { Check } from 'lucide-react'
import type { Item, Member } from '../lib/types'
import { clock } from '../lib/time'

interface Props {
  item: Item
  author?: Member
  seen?: boolean
  onOpen: () => void
}

export function LinkCard({ item, author, seen = false, onOpen }: Props) {
  const color = author?.color ?? '#5C4033'
  return (
    <button type="button" className="item-link" onClick={onOpen}>
      <span className="item-link-bar" style={{ background: color }} aria-hidden="true" />
      <span className="item-link-title">{item.title || item.url}</span>
      <span className="item-link-meta">
        {author?.name ?? '有人'} · {clock(item.createdAt)}
      </span>
      {seen && (
        <span className="seen-dot" title="这页我看过">
          <Check size={10} strokeWidth={2.5} />
        </span>
      )}
    </button>
  )
}
