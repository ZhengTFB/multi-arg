import type { Item, Member } from '../lib/types'
import { clock } from '../lib/time'
import { initial } from '../lib/color'

interface Props {
  item: Item
  author?: Member
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

export function LinkCard({ item, author, mine, grouped = false, onOpen }: Props) {
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
        </button>
      </div>
    </div>
  )
}
