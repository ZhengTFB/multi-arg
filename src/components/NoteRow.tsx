import { Star, X } from 'lucide-react'
import type { Item, Member } from '../lib/types'
import { clock } from '../lib/time'

interface Props {
  item: Item
  author?: Member
  comment?: boolean
  mine?: boolean
  onStar: () => void
  onExclude: () => void
}

export function NoteRow({ item, author, comment = false, mine = false, onStar, onExclude }: Props) {
  const excluded = item.status === 'excluded'
  return (
    <div
      className={comment ? 'note-row comment' : 'note-row'}
      data-excluded={excluded}
      id={`item-${item.id}`}
    >
      {!comment &&
        (item.starred ? (
          <Star
            size={11}
            fill="currentColor"
            style={{ marginTop: 7, flex: '0 0 auto', color: 'var(--honey-deep)' }}
          />
        ) : (
          <span className="note-dot" style={{ background: author?.color ?? 'var(--line)' }} />
        ))}
      <div className="note-main">
        <div className="note-text">{item.text}</div>
        <div className="note-meta">
          <span>{author?.name ?? '有人'}</span>
          <span>·</span>
          <span>{clock(item.createdAt)}</span>
        </div>
      </div>
      {mine && (
        <div className="note-actions">
          <button
            type="button"
            className="note-action"
            data-on={!!item.starred}
            title="标进公共区"
            onClick={onStar}
          >
            <Star size={12} fill={item.starred ? 'currentColor' : 'none'} strokeWidth={1.5} />
          </button>
          <button type="button" className="note-action" title="排除" onClick={onExclude}>
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  )
}
