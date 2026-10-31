import { Check } from 'lucide-react'
import type { Item, Member } from '../lib/types'
import { clock } from '../lib/time'
import { initial } from '../lib/color'
import { t } from '../lib/copy'

interface Props {
  item: Item
  author?: Member
  seen?: boolean
  mine: boolean
  grouped?: boolean
  onOpen: () => void
}

function hostOf(url: string): string {
  try {
    const parsed = new URL(url, location.origin)
    const proxied = parsed.searchParams.get('u')
    if (proxied) return new URL(proxied).host.replace(/^www\./, '')
    if (parsed.origin === location.origin) return parsed.pathname.replace(/^\//, '') || '本站'
    return parsed.host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function LinkCard({ item, author, seen = false, mine, grouped = false, onOpen }: Props) {
  const color = author?.color ?? '#5C4033'
  const title = item.title || item.url || ''

  return (
    <div className="msg" data-mine={mine} data-group={grouped}>
      <span className="msg-avatar" style={{ background: color }}>
        {initial(author?.name ?? '')}
      </span>
      <div className="msg-body">
        {!grouped && (
          <div className="msg-head">
            <b>{author?.name ?? '有人'}</b>
            <time>{clock(item.createdAt)}</time>
          </div>
        )}
        <button type="button" className="link-bubble" onClick={onOpen}>
          <span className="link-thumb" style={{ background: `${color}1A`, color }}>
            {initial(title)}
          </span>
          <span className="link-text">
            <span className="link-title">{title}</span>
            <span className="link-host">{hostOf(item.url ?? '')}</span>
          </span>
          {seen && (
            <span className="link-seen" title={t('room.seen')}>
              <Check size={10} strokeWidth={2.5} />
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
