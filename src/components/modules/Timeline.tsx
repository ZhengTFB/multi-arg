import type { Item, Member } from '../../lib/types'

interface Props {
  items: Item[]
  members: Member[]
}

export function Timeline({ items, members }: Props) {
  const byId = new Map(members.map((m) => [m.id, m]))
  const list = items
    .filter((i) => i.type === 'event' && i.event)
    .sort((a, b) => (a.event!.at < b.event!.at ? -1 : 1))

  if (list.length === 0) {
    return (
      <div className="module">
        <p className="feed-empty">把时间点记下来，后面会用到。</p>
      </div>
    )
  }

  return (
    <div className="module">
      <div className="timeline">
        {list.map((item) => (
          <div key={item.id} className="tl-item">
            <span className="tl-dot" />
            <p className="tl-at">{item.event!.at}</p>
            <p className="tl-text">{item.event!.text}</p>
            <p className="note-meta">{byId.get(item.authorId)?.name ?? '有人'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
