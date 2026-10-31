import { useState } from 'react'
import type { Item } from '../../lib/types'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
  onAdd: (word: string, result: 'hit' | 'miss' | 'invalid') => void
  onCycle: (item: Item) => void
}

type Result = 'hit' | 'miss' | 'invalid'

const LABEL: Record<Result, Parameters<typeof t>[0]> = {
  hit: 'keyword.hit',
  miss: 'keyword.miss',
  invalid: 'keyword.invalid',
}

const CLASS: Record<Result, string> = {
  miss: 'tag tag--miss',
  hit: 'tag tag--hit',
  invalid: 'tag tag--clay',
}

function parse(raw: string): { word: string; result: Result } {
  const cleaned = raw.replace(/^词\s*/, '')
  const parts = cleaned.split(/[=＝]/)
  const word = (parts[0] ?? '').trim()
  const tail = (parts[1] ?? '').trim()
  const result: Result = tail.includes('无效') ? 'invalid' : tail.includes('未') ? 'miss' : 'hit'
  return { word, result }
}

export function Keywords({ items, onAdd, onCycle }: Props) {
  const [draft, setDraft] = useState('')
  const list = items
    .filter((i) => i.type === 'keyword')
    .sort((a, b) => b.createdAt - a.createdAt)

  const count = (result: Result) => list.filter((i) => (i.result ?? 'miss') === result).length
  const hits = count('hit')
  const invalid = count('invalid')

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
          {hits} 有效 · {invalid} 无效
        </span>
      </div>

      <div className="kw-add">
        <input
          value={draft}
          placeholder={t('keyword.placeholder')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit()
          }}
          aria-label={t('keyword.placeholder')}
        />
      </div>

      <div className="kw-list">
        {list.map((item) => {
          const result = (item.result ?? 'miss') as Result
          return (
            <div key={item.id} className="kw-row">
              <span className="kw-word">{item.keyword}</span>
              <button
                type="button"
                className={CLASS[result]}
                title="点一下切状态：未尝试 → 有效 → 无效"
                onClick={() => onCycle(item)}
              >
                {t(LABEL[result])}
              </button>
            </div>
          )
        })}
        {list.length === 0 && <p className="feed-empty">{t('keyword.empty')}</p>}
      </div>
    </div>
  )
}
