import { Star, X } from 'lucide-react'
import type { Item, Member } from '../lib/types'
import { clock } from '../lib/time'
import { initial } from '../lib/color'

interface Props {
  item: Item
  author?: Member
  mine: boolean
  grouped?: boolean
  onStar: () => void
  onExclude: () => void
}

/** 一条文字消息。同一人连着说话时不重复头像和名字。 */
export function NoteRow({ item, author, mine, grouped = false, onStar, onExclude }: Props) {
  const excluded = item.status === 'excluded'
  return (
    <div
      className="msg"
      data-mine={mine}
      data-group={grouped}
      data-excluded={excluded}
      id={`item-${item.id}`}
    >
      <span className="msg-avatar" style={{ background: author?.color ?? 'var(--line)' }}>
        {initial(author?.name ?? '')}
      </span>
      <div className="msg-body">
        {!grouped && (
          <div className="msg-head">
            <b>{author?.name ?? '有人'}</b>
            <time>{clock(item.createdAt)}</time>
          </div>
        )}
        <div className="msg-bubble">
          {item.starred && (
            <span className="msg-star">
              <Star size={10} fill="currentColor" strokeWidth={0} />
            </span>
          )}
          {item.text}
        </div>
        {mine && (
          <div className="msg-actions">
            <button
              type="button"
              className="msg-action"
              data-on={!!item.starred}
              title="标进公共区"
              onClick={onStar}
            >
              <Star size={12} fill={item.starred ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
            <button type="button" className="msg-action" title="排除" onClick={onExclude}>
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
