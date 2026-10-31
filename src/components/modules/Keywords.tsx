import { useState } from 'react'
import type { Item } from '../../lib/types'

interface Props {
  items: Item[]
  onAdd: (word: string, result: 'hit' | 'miss') => void
  onToggleResult: (item: Item) => void
}

function parse(raw: string): { word: string; result: 'hit' | 'miss' } {
  const cleaned = raw.replace(/^词\s*/, '')
  const parts = cleaned.split(/[=＝]/)
  const word = (parts[0] ?? '').trim()
  const tail = (parts[1] ?? '').trim()
  return { word, result: tail.includes('未') ? 'miss' : 'hit' }
}

export function Keywords({ items, onAdd, onToggleResult }: Props) {
  const [draft, setDraft] = useState('')
  const list = items
    .filter((i) => i.type === 'keyword')
    .sort((a, b) => b.createdAt - a.createdAt)
  const hits = list.filter((i) => i.result === 'hit').length

  const commit = () => {
    const { word, result } = parse(draft)
    if (!word) return
    onAdd(word, result)
    setDraft('')
  }

  return (
    <div className="module">
      <div className="module-head">
        <span>
          {hits} 命中 · {list.length - hits} 未命中
        </span>
      </div>

      <div className="kw-add">
        <input
          value={draft}
          placeholder="词 = 命中"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit()
          }}
          aria-label="记一个关键词"
        />
      </div>

      <div className="kw-list">
        {list.map((item) => (
          <div key={item.id} className="kw-row">
            <span className="kw-word">{item.keyword}</span>
            <button
              type="button"
              className={`tag ${item.result === 'hit' ? 'tag--hit' : 'tag--miss'}`}
              title="点一下换结果"
              onClick={() => onToggleResult(item)}
            >
              {item.result === 'hit' ? '命中' : '未命中'}
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <p className="feed-empty">
            还没有记录。试试 <span className="mono">符咒 = 命中</span>。
          </p>
        )}
      </div>
    </div>
  )
}
