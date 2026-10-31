import { useMemo, useState } from 'react'
import { Star, X } from 'lucide-react'
import type { Item, Member } from '../lib/types'
import { clock } from '../lib/time'
import { t } from '../lib/copy'

interface Props {
  items: Item[]
  members: Member[]
  meId: string
  memberFilter: string
  starOnly: boolean
  query: string
  onStar: (item: Item) => void
  onExclude: (item: Item) => void
}

/**
 * 笔记不是聊天：一行一条，按时间倒序，公共笔记单独一段。
 * 星标进公共笔记，叉掉进已排除，两段都在这儿管理。
 */
export function NoteList({
  items,
  members,
  meId,
  memberFilter,
  starOnly,
  query,
  onStar,
  onExclude,
}: Props) {
  const [showExcluded, setShowExcluded] = useState(false)

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((i) => i.type === 'note' && !i.refId)
      .filter((i) => {
        if (memberFilter === 'all') return true
        if (memberFilter === 'me') return i.authorId === meId
        return i.authorId === memberFilter
      })
      .filter((i) => (q ? (i.text ?? '').toLowerCase().includes(q) : true))
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [items, memberFilter, query, meId])

  const starred = list.filter((i) => i.starred && i.status !== 'excluded')
  const excluded = list.filter((i) => i.status === 'excluded')
  const normal = list.filter((i) => !i.starred && i.status !== 'excluded')

  const renderRow = (item: Item) => {
    const author = byId.get(item.authorId)
    const mine = item.authorId === meId
    return (
      <div className="note-line" data-excluded={item.status === 'excluded'} key={item.id}>
        <time className="note-line-time mono">{clock(item.createdAt)}</time>
        <span className="note-line-text">{item.text}</span>
        <span className="note-line-author">
          <i style={{ background: author?.color ?? 'var(--line)' }} />
          {author?.name ?? '有人'}
        </span>
        {mine && (
          <span className="note-line-actions">
            <button
              type="button"
              className="msg-action"
              data-on={!!item.starred}
              title="标进公共笔记"
              onClick={() => onStar(item)}
            >
              <Star size={11} fill={item.starred ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
            <button type="button" className="msg-action" title="排除" onClick={() => onExclude(item)}>
              <X size={12} strokeWidth={1.5} />
            </button>
          </span>
        )}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="notes">
        <p className="feed-empty">{t('room.note.empty')}</p>
      </div>
    )
  }

  return (
    <div className="notes">
      {starOnly ? (
        <section className="note-section">
          <div className="note-section-head">
            <span data-copy="room.notes.public">{t('room.notes.public')}</span>
            <span className="note-section-count mono">{starred.length}</span>
          </div>
          {starred.length === 0 ? (
            <p className="note-section-empty" data-copy="room.notes.empty.public">
              {t('room.notes.empty.public')}
            </p>
          ) : (
            <div className="note-lines">{starred.map(renderRow)}</div>
          )}
        </section>
      ) : (
        <>
          {starred.length > 0 && (
            <section className="note-section" data-tone="public">
              <div className="note-section-head">
                <span data-copy="room.notes.public">{t('room.notes.public')}</span>
                <span className="note-section-count mono">{starred.length}</span>
              </div>
              <div className="note-lines">{starred.map(renderRow)}</div>
            </section>
          )}

          <section className="note-section">
            <div className="note-section-head">
              <span data-copy="room.notes.all">{t('room.notes.all')}</span>
              <span className="note-section-count mono">{normal.length}</span>
            </div>
            <div className="note-lines">{normal.map(renderRow)}</div>
          </section>

          {excluded.length > 0 && (
            <section className="note-section" data-tone="muted">
              <button
                type="button"
                className="note-section-head as-button"
                onClick={() => setShowExcluded((v) => !v)}
              >
                <span data-copy="room.notes.excluded">{t('room.notes.excluded')}</span>
                <span className="note-section-count mono">{excluded.length}</span>
              </button>
              {showExcluded && <div className="note-lines">{excluded.map(renderRow)}</div>}
            </section>
          )}
        </>
      )}
    </div>
  )
}
