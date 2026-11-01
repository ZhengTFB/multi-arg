import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, Plus, RotateCw, X } from 'lucide-react'
import { t } from '../lib/copy'

export interface Tab {
  id: string
  url: string
  title: string
}

interface Props {
  tabs: Tab[]
  activeId: string
  /** 页面里自己翻到的那一页（同源代理才读得到），地址栏显示它以真实位置为准 */
  liveUrl?: string
  canBack: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  onNavigate: (url: string) => void
  onReload: () => void
  onBack: () => void
}

function pretty(url: string): string {
  try {
    const parsed = new URL(url, location.origin)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.host.replace(/^www\./, '')}${path}${parsed.search}`
  } catch {
    return url
  }
}

/** 游戏区顶上的浏览器条：返回、地址（点开可改）、刷新、新标签页，下面是一排标签。 */
export function BrowserTabs({
  tabs,
  activeId,
  liveUrl,
  canBack,
  onSelect,
  onClose,
  onNew,
  onNavigate,
  onReload,
  onBack,
}: Props) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  const shown = liveUrl || active?.url || ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditing(false)
  }, [activeId])

  useEffect(() => {
    if (editing) {
      setDraft(shown)
      window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 30)
    }
  }, [editing, shown])

  const submit = () => {
    const raw = draft.trim()
    if (!raw) return
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    setEditing(false)
    onNavigate(url)
  }

  return (
    <div className="browser">
      <div className="browser-bar">
        <button
          type="button"
          className="browser-btn"
          disabled={!canBack}
          aria-label="返回"
          onClick={onBack}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
        </button>

        {editing ? (
          <form
            className="browser-addr"
            data-editing="true"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => window.setTimeout(() => setEditing(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false)
              }}
              placeholder={t('room.url.placeholder')}
              spellCheck={false}
            />
          </form>
        ) : (
          <button
            type="button"
            className="browser-addr"
            onClick={() => setEditing(true)}
            title={shown}
          >
            <span className="browser-addr-text">{pretty(shown)}</span>
            <span className="browser-addr-pen">✎</span>
          </button>
        )}

        <button type="button" className="browser-btn" aria-label={t('room.reload')} onClick={onReload}>
          <RotateCw size={14} strokeWidth={1.8} />
        </button>
        <button type="button" className="browser-btn" aria-label={t('room.tab.new')} onClick={onNew}>
          <Plus size={15} strokeWidth={1.8} />
        </button>
      </div>

      {tabs.length > 1 && (
        <div className="tabstrip">
          <ChevronLeft size={13} strokeWidth={1.8} className="tabstrip-caret" />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="tab"
              data-active={tab.id === activeId}
              onClick={() => onSelect(tab.id)}
              title={tab.url}
            >
              <span>{tab.title || pretty(tab.url)}</span>
              <span
                className="tab-x"
                role="presentation"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
              >
                <X size={10} strokeWidth={2} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
