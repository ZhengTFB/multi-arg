import { useRef } from 'react'
import { LayoutGrid, MessageSquare, PenLine, Send, UserPlus } from 'lucide-react'
import { t } from '../lib/copy'

export type RailAction = 'sharePage' | 'feed' | 'note' | 'modules' | 'invite'

const ICONS: { key: RailAction; Icon: typeof Send; label: string }[] = [
  { key: 'sharePage', Icon: Send, label: t('room.rail.sharepage') },
  { key: 'feed', Icon: MessageSquare, label: t('room.rail.feed') },
  { key: 'note', Icon: PenLine, label: t('room.rail.note') },
  { key: 'modules', Icon: LayoutGrid, label: t('room.rail.modules') },
  { key: 'invite', Icon: UserPlus, label: t('room.rail.invite') },
]

interface Props {
  open: boolean
  breath?: boolean
  onToggle: (open: boolean) => void
  onAction: (action: RailAction) => void
}

export function EdgeRail({ open, breath = false, onToggle, onAction }: Props) {
  const start = useRef<{ x: number; y: number } | null>(null)

  return (
    <>
      <div
        className="seam-zone"
        role="presentation"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (Math.abs(dx) > Math.abs(dy) && dx < -40) {
            onToggle(!open)
            start.current = null
          }
        }}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          if (!s) return
          if (Math.abs(e.clientX - s.x) < 8 && Math.abs(e.clientY - s.y) < 8) onToggle(!open)
        }}
        onPointerCancel={() => {
          start.current = null
        }}
      >
        <span className="seam" data-breath={breath} />
      </div>

      <div className="rail" data-open={open}>
        {ICONS.map(({ key, Icon, label }) => (
          <button
            key={key}
            type="button"
            className="rail-btn"
            aria-label={label}
            title={label}
            onClick={() => {
              onToggle(false)
              onAction(key)
            }}
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </>
  )
}
