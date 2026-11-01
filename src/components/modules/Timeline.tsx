import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical } from 'lucide-react'
import type { Item, Member } from '../../lib/types'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
  members: Member[]
  onReorder: (ids: string[]) => void
}

export function Timeline({ items, members, onReorder }: Props) {
  const byId = new Map(members.map((m) => [m.id, m]))
  const base = items
    .filter((i) => i.type === 'event' && i.event)
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))

  const [local, setLocal] = useState<string[] | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const ids = local ?? base.map((i) => i.id)
  const ordered = ids.map((id) => base.find((i) => i.id === id)).filter(Boolean) as Item[]

  const onDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    setDrag(id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('.tl-item') ?? [])]
    const from = ids.indexOf(drag)
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect()
      if (e.clientY > rect.top && e.clientY < rect.bottom && i !== from) {
        const next = [...ids]
        next.splice(from, 1)
        next.splice(i, 0, drag)
        setLocal(next)
        break
      }
    }
  }

  const onUp = () => {
    if (local) onReorder(local)
    setDrag(null)
    window.setTimeout(() => setLocal(null), 800)
  }

  return (
    <div className="module">
      <div className="module-head">
        <span>{base.length} 个时间点</span>
        <span className="people-hint">按住左侧握手可以拖动排序</span>
      </div>

      {base.length === 0 ? (
        <p className="feed-empty">{t('timeline.empty')}</p>
      ) : (
        <div className="timeline" ref={listRef}>
          {ordered.map((item) => (
            <div
              key={item.id}
              className="tl-item"
              data-dragging={drag === item.id}
              onPointerDown={(e) => onDown(e, item.id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <GripVertical size={14} strokeWidth={1.6} className="tl-grip" />
              <span className="tl-dot" />
              <p className="tl-at">{item.event!.at}</p>
              <p className="tl-text">{item.event!.text}</p>
              <p className="note-meta">{byId.get(item.authorId)?.name ?? '有人'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
