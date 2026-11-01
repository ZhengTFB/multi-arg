import { useState } from 'react'
import type { Item, Member } from '../../lib/types'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
  members: Member[]
  onAdd: (at: string, text: string) => void
}

export function Timeline({ items, members, onAdd }: Props) {
  const [at, setAt] = useState('')
  const [text, setText] = useState('')
  const byId = new Map(members.map((m) => [m.id, m]))
  const list = items
    .filter((i) => i.type === 'event' && i.event)
    .sort((a, b) => (a.event!.at < b.event!.at ? -1 : 1))

  const commit = () => {
    const when = at.trim()
    const what = text.trim()
    if (!when || !what) return
    onAdd(when, what)
    setAt('')
    setText('')
  }

  return (
    <div className="module">
      <div className="module-head">
        <span>{list.length} 个时间点</span>
      </div>

      <div className="module-add">
        <input
          value={at}
          placeholder="03:58"
          style={{ maxWidth: 84 }}
          onChange={(e) => setAt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit()
          }}
        />
        <input
          value={text}
          placeholder={t('modules.add.event')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit()
          }}
        />
        <button type="button" className="tag tag--hit" onClick={commit} disabled={!at || !text}>
          {t('modules.add')}
        </button>
      </div>

      {list.length === 0 ? (
        <p className="feed-empty">{t('timeline.empty')}</p>
      ) : (
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
      )}
    </div>
  )
}
