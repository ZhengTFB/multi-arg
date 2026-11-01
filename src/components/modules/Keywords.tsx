import type { Item } from '../../lib/types'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
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

export function Keywords({ items, onCycle }: Props) {
  const list = items
    .filter((i) => i.type === 'keyword')
    .sort((a, b) => b.createdAt - a.createdAt)

  const count = (result: Result) => list.filter((i) => (i.result ?? 'miss') === result).length
  const hits = count('hit')
  const invalid = count('invalid')

  return (
    <div className="module">
      <div className="module-head">
        <span>
          {hits} 有效 · {invalid} 无效
        </span>
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
