import { Search } from 'lucide-react'
import { t } from '../lib/copy'

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
            placeholder={t('room.search')}
            onChange={(e) => onChange(e.target.value)}
            aria-label={t('room.search')}
          />
        </label>
        <button
          type="button"
          className="tag tag--miss"
          title={t('room.search.save')}
          data-copy="room.search.save"
          disabled={!q}
          style={{ opacity: q ? 1 : 0.55 }}
          onClick={() => onSaveKeyword(q)}
        >
          {t('room.search.save')}
        </button>
      </div>

      {q && hasSearch && (
        <div className="search-sug">
          <button type="button" className="sug-row" onClick={() => onSearchInGame(q)}>
            <span>
              {t('room.search.ingame')}「<b>{q}</b>」
            </span>
          </button>
          <div className="sug-row">
            <span>
              {t('room.search.count')} {localCount} 条
            </span>
            {localCount > 0 && (
              <button
                type="button"
                className="tag tag--hit"
                data-copy="room.search.share"
                onClick={() => onShareResult(q)}
                title={t('room.search.share')}
              >
                {t('room.search.share')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
