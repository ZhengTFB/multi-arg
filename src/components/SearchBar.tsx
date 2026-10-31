import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  hasSearch: boolean
  localCount: number
  onSearchInGame: (q: string) => void
  onSaveKeyword: (q: string) => void
  onShareResult: (q: string) => void
}

export function SearchBar({
  value,
  onChange,
  hasSearch,
  localCount,
  onSearchInGame,
  onSaveKeyword,
  onShareResult,
}: Props) {
  const q = value.trim()
  return (
    <div>
      <div className="searchbar">
        <label className="search-field">
          <Search size={13} strokeWidth={1.5} style={{ color: 'var(--earth-2)', flex: '0 0 auto' }} />
          <input
            data-search-input
            value={value}
            placeholder="搜点什么"
            onChange={(e) => onChange(e.target.value)}
            aria-label="搜索"
          />
        </label>
        <button
          type="button"
          className="tag tag--miss"
          title="存成关键词"
          disabled={!q}
          style={{ opacity: q ? 1 : 0.55 }}
          onClick={() => onSaveKeyword(q)}
        >
          词
        </button>
      </div>

      {q && hasSearch && (
        <div className="search-sug">
          <button type="button" className="sug-row" onClick={() => onSearchInGame(q)}>
            <span>
              在游戏里搜「<b>{q}</b>」
            </span>
          </button>
          <div className="sug-row">
            <span>我们记过 {localCount} 条</span>
            {localCount > 0 && (
              <button
                type="button"
                className="tag tag--hit"
                onClick={() => onShareResult(q)}
                title="把这一页发给大家"
              >
                发给大家
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
