import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Share, X } from 'lucide-react'
import type { Item, Member, Room } from '../lib/types'
import { Segmented } from './ui/Segmented'
import type { SegItem } from './ui/Segmented'
import { SearchBar } from './SearchBar'
import { MemberBar } from './MemberBar'
import { Feed } from './Feed'
import { Composer } from './Composer'
import { People } from './modules/People'
import { Keywords } from './modules/Keywords'
import { Secrets } from './modules/Secrets'
import { Timeline } from './modules/Timeline'
import { initial } from '../lib/color'
import { ago } from '../lib/time'

export type View = 'feed' | 'note' | 'people' | 'keyword' | 'secret' | 'timeline'

interface Props {
  room: Room
  members: Member[]
  items: Item[]
  me: Member
  view: View
  onView: (v: View) => void
  variant: 'side' | 'drawer'
  open: boolean
  conn: 'ok' | 'off' | null
  seen: Set<string>
  unread: Set<string>
  onOpenInvite: () => void
  onCloseDrawer: () => void
  onOpenLink: (item: Item) => void
  onStar: (item: Item) => void
  onExclude: (item: Item) => void
  onSend: (text: string) => void
  onSearchInGame: (q: string) => void
  onSaveKeyword: (q: string) => void
  onShareResult: (q: string) => void
  onAddKeyword: (word: string, result: 'hit' | 'miss') => void
  onToggleKeyword: (item: Item) => void
  onToggleVerify: (item: Item) => void
  onReplayOnboarding: () => void
}

const LIVE_MS = 5 * 60_000

export function Panel(props: Props) {
  const {
    room,
    members,
    items,
    me,
    view,
    onView,
    variant,
    open,
    conn,
    seen,
    unread,
    onOpenInvite,
    onCloseDrawer,
    onOpenLink,
    onStar,
    onExclude,
    onSend,
    onSearchInGame,
    onSaveKeyword,
    onShareResult,
    onAddKeyword,
    onToggleKeyword,
    onToggleVerify,
    onReplayOnboarding,
  } = props

  const [query, setQuery] = useState('')
  const [memberFilter, setMemberFilter] = useState('all')
  const [starOnly, setStarOnly] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(-1)

  const segs: SegItem[] = [{ key: 'feed', label: '流' }]
  if (room.modules.includes('note')) segs.push({ key: 'note', label: '笔记' })
  if (room.modules.includes('person')) segs.push({ key: 'people', label: '图' })
  if (room.modules.includes('keyword')) segs.push({ key: 'keyword', label: '词' })
  if (room.modules.includes('secret')) segs.push({ key: 'secret', label: '密' })
  if (room.modules.includes('timeline')) segs.push({ key: 'timeline', label: '时' })

  const q = query.trim().toLowerCase()
  const localCount = useMemo(() => {
    if (!q) return 0
    return items.filter((item) => {
      const hay = [
        item.text,
        item.title,
        item.keyword,
        item.person?.name,
        item.person?.note,
        item.secret?.account,
        item.secret?.usage,
        item.event?.text,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    }).length
  }, [items, q])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (view !== 'feed' && view !== 'note') {
      lastCount.current = -1
      return
    }
    if (items.length !== lastCount.current) {
      lastCount.current = items.length
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [items.length, view])

  useEffect(() => {
    if (!membersOpen) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as Element | null
      if (el?.closest('.popover') || el?.closest('[data-members-btn]')) return
      setMembersOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [membersOpen])

  return (
    <div className="panel" data-open={variant === 'drawer' ? true : open}>
      <div className="panel-head">
        <button type="button" className="panel-room" onClick={onOpenInvite} title="邀请">
          {room.id}
        </button>
        <span className="panel-room-dot">·</span>
        <button
          type="button"
          className="panel-count"
          data-members-btn
          onClick={() => setMembersOpen((v) => !v)}
        >
          {members.length} 人
          <ChevronDown size={12} strokeWidth={1.5} />
        </button>
        <span className="panel-head-spacer" />
        <button type="button" className="icon-btn" aria-label="邀请" onClick={onOpenInvite}>
          <Share size={15} strokeWidth={1.5} />
        </button>
        {variant === 'drawer' && (
          <button type="button" className="icon-btn" aria-label="收起" onClick={onCloseDrawer}>
            <X size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {conn && <div className="connbar" data-state={conn}>{conn === 'off' ? '连接断了，正在重连' : '已连上'}</div>}

      <Segmented items={segs} value={view} onChange={(k) => onView(k as View)} />

      <SearchBar
        value={query}
        onChange={setQuery}
        hasSearch={room.game.hasSearch}
        localCount={localCount}
        onSearchInGame={onSearchInGame}
        onSaveKeyword={onSaveKeyword}
        onShareResult={onShareResult}
      />

      <div className="panel-body">
        <div className="panel-scroll" ref={scrollRef}>
          {view === 'note' && (
            <MemberBar
              members={members}
              meId={me.id}
              filter={memberFilter}
              starOnly={starOnly}
              unread={unread}
              onFilter={setMemberFilter}
              onStarOnly={setStarOnly}
            />
          )}

          {(view === 'feed' || view === 'note') && (
            <Feed
              items={items}
              members={members}
              meId={me.id}
              mode={view === 'note' ? 'note' : 'feed'}
              memberFilter={memberFilter}
              starOnly={starOnly}
              query={query}
              seen={seen}
              onOpenLink={onOpenLink}
              onStar={onStar}
              onExclude={onExclude}
            />
          )}

          {view === 'people' && <People items={items} members={members} />}
          {view === 'keyword' && (
            <Keywords items={items} onAdd={onAddKeyword} onToggleResult={onToggleKeyword} />
          )}
          {view === 'secret' && <Secrets items={items} onToggleVerify={onToggleVerify} />}
          {view === 'timeline' && <Timeline items={items} members={members} />}
        </div>

        {(view === 'feed' || view === 'note') && <Composer onSend={onSend} />}
      </div>

      {membersOpen && (
        <div className="popover">
          <div className="member-list">
            {members.map((m) => {
              const live = m.current && Date.now() - m.current.at < LIVE_MS
              return (
                <div className="member-row" key={m.id}>
                  <span className="avatar" style={{ background: m.color }}>
                    {initial(m.name)}
                  </span>
                  <div className="member-main">
                    <div className="member-name">
                      {m.name}
                      {m.id === me.id && (
                        <span className="muted" style={{ fontSize: 10 }}>
                          你
                        </span>
                      )}
                    </div>
                    <div className="member-sub">
                      {live ? `正在看《${m.current!.title}》` : `最后活跃 ${ago(m.lastSeen)}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="popover-foot">
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setMembersOpen(false)
                onReplayOnboarding()
              }}
            >
              重看引导
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
