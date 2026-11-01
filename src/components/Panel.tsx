import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, PanelRightClose, Send, UserPlus, X } from 'lucide-react'
import type { Item, Member, Room } from '../lib/types'
import { Segmented } from './ui/Segmented'
import type { SegItem } from './ui/Segmented'
import { SearchBar } from './SearchBar'
import { MemberBar } from './MemberBar'
import { Feed } from './Feed'
import { NoteList } from './NoteList'
import { Composer } from './Composer'
import { People } from './modules/People'
import { Keywords } from './modules/Keywords'
import { Secrets } from './modules/Secrets'
import { Timeline } from './modules/Timeline'
import { initial } from '../lib/color'
import { ago } from '../lib/time'
import { t } from '../lib/copy'

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
  unread: Set<string>
  onOpenInvite: () => void
  /** 收起面板，进入沉浸模式 */
  onImmersive: () => void
  onOpenLink: (item: Item) => void
  onStar: (item: Item) => void
  onExclude: (item: Item) => void
  onSend: (text: string) => void
  onSearchInGame: (q: string) => void
  onSaveKeyword: (q: string) => void
  onShareResult: (q: string) => void
  onAddKeyword: (word: string, result: 'hit' | 'miss' | 'invalid') => void
  onAddPerson: (name: string, note: string) => void
  onAddEvent: (at: string, text: string) => void
  onAddSecret: (account: string, password: string, usage: string) => void
  onAddRelation: (from: string, to: string, label: string) => void
  onReorderTimeline: (ids: string[]) => void
  onToggleKeyword: (item: Item) => void
  onToggleVerify: (item: Item) => void
  onReplayOnboarding: () => void
  /** 把当前这一页发给大家 */
  onSharePage: () => void
  /** 有人分享页面时，面板顶部浮一条提示 */
  notice: ShareNotice | null
  onOpenNotice: () => void
  onDismissNotice: () => void
}

export interface ShareNotice {
  id: string
  authorName: string
  title: string
}

type ComposeKind = 'people' | 'event' | 'secret' | 'keyword'

const COMPOSE: Record<ComposeKind, { title: string; fields: { key: string; placeholder: string }[] }> = {
  people: {
    title: '添加人物',
    fields: [
      { key: 'name', placeholder: '名字' },
      { key: 'note', placeholder: '备注（可空）' },
    ],
  },
  event: {
    title: '添加时间点',
    fields: [
      { key: 'eventAt', placeholder: '03:58' },
      { key: 'text', placeholder: '发生了什么' },
    ],
  },
  secret: {
    title: '添加密码',
    fields: [
      { key: 'account', placeholder: '账号 / 用途名' },
      { key: 'password', placeholder: '密码' },
      { key: 'usage', placeholder: '用在哪（可空）' },
    ],
  },
  keyword: {
    title: '添加关键词',
    fields: [{ key: 'word', placeholder: '输入可能的搜索关键词' }],
  },
}

const COMPOSE_BY_VIEW: Partial<Record<View, ComposeKind>> = {
  people: 'people',
  keyword: 'keyword',
  secret: 'secret',
  timeline: 'event',
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
    unread,
    onOpenInvite,
    onImmersive,
    onOpenLink,
    onStar,
    onExclude,
    onSend,
    onSearchInGame,
    onSaveKeyword,
    onShareResult,
    onAddKeyword,
    onAddPerson,
    onAddEvent,
    onAddSecret,
    onAddRelation,
    onReorderTimeline,
    onToggleKeyword,
    onToggleVerify,
    onReplayOnboarding,
    onSharePage,
    notice,
    onOpenNotice,
    onDismissNotice,
  } = props

  const [query, setQuery] = useState('')
  const [memberFilter, setMemberFilter] = useState('all')
  const [starOnly, setStarOnly] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [compose, setCompose] = useState<ComposeKind | null>(null)
  const [f1, setF1] = useState('')
  const [f2, setF2] = useState('')
  const [f3, setF3] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(-1)

  const composeKind = COMPOSE_BY_VIEW[view]

  // 切到别的视图时把新建卡片收起来
  useEffect(() => {
    setCompose(null)
  }, [view])

  const openCompose = (kind: ComposeKind) => {
    setCompose(kind)
    setF1('')
    setF2('')
    setF3('')
  }

  const submitCompose = () => {
    if (!compose) return
    if (compose === 'people' && f1.trim()) onAddPerson(f1.trim(), f2.trim())
    if (compose === 'event' && f1.trim() && f2.trim()) onAddEvent(f1.trim(), f2.trim())
    if (compose === 'secret' && f1.trim() && f2.trim())
      onAddSecret(f1.trim(), f2.trim(), f3.trim())
    if (compose === 'keyword' && f1.trim()) onAddKeyword(f1.trim(), 'miss')
    setCompose(null)
  }

  const segs: SegItem[] = [{ key: 'feed', label: t('tabs.feed'), copyKey: 'tabs.feed' }]
  if (room.modules.includes('note'))
    segs.push({ key: 'note', label: t('tabs.note'), copyKey: 'tabs.note' })
  if (room.modules.includes('person'))
    segs.push({ key: 'people', label: t('tabs.people'), copyKey: 'tabs.people' })
  if (room.modules.includes('keyword'))
    segs.push({ key: 'keyword', label: t('tabs.keyword'), copyKey: 'tabs.keyword' })
  if (room.modules.includes('secret'))
    segs.push({ key: 'secret', label: t('tabs.secret'), copyKey: 'tabs.secret' })
  if (room.modules.includes('timeline'))
    segs.push({ key: 'timeline', label: t('tabs.timeline'), copyKey: 'tabs.timeline' })

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
        <button type="button" className="panel-room" onClick={onOpenInvite} title={t('room.invite.title')}>
          <span className="panel-room-label" data-copy="room.room.label">
            {t('room.room.label')}
          </span>
          <span className="panel-room-code">{room.id}</span>
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
        <button
          type="button"
          className="share-cta"
          aria-label={t('room.rail.sharepage')}
          title={t('room.rail.sharepage')}
          onClick={onSharePage}
        >
          <Send size={13} strokeWidth={1.8} />
          <span data-copy="room.rail.sharepage">{t('room.rail.sharepage')}</span>
        </button>
        <button
          type="button"
          className="invite-entry"
          onClick={onOpenInvite}
          title={t('room.invite.title')}
        >
          <UserPlus size={13} strokeWidth={1.6} />
          <span data-copy="room.invite.entry">{t('room.invite.entry')}</span>
        </button>
        {variant === 'side' && (
          <button
            type="button"
            className="icon-btn"
            aria-label={t('room.immersive')}
            title={t('room.immersive')}
            onClick={onImmersive}
          >
            <PanelRightClose size={16} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {conn && (
        <div className="connbar" data-state={conn}>
          {conn === 'off' ? t('room.conn.off') : t('room.conn.ok')}
        </div>
      )}

      {notice && (
        <div className="share-notice">
          <button type="button" className="share-notice-body" onClick={onOpenNotice}>
            <b>{notice.authorName}</b>
            <span data-copy="room.notice.shared"> {t('room.notice.shared')}</span>
            <span className="share-notice-title">{notice.title}</span>
          </button>
          <button
            type="button"
            className="share-notice-open"
            data-copy="room.notice.open"
            onClick={onOpenNotice}
          >
            {t('room.notice.open')}
          </button>
          <button
            type="button"
            className="share-notice-x"
            aria-label="关闭"
            onClick={onDismissNotice}
          >
            <X size={12} strokeWidth={1.6} />
          </button>
        </div>
      )}

      <Segmented items={segs} value={view} onChange={(k) => onView(k as View)} />

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
        <SearchBar
          value={query}
          onChange={setQuery}
          hasSearch={room.game.hasSearch}
          localCount={localCount}
          onSearchInGame={onSearchInGame}
          onSaveKeyword={onSaveKeyword}
          onShareResult={onShareResult}
        />
      )}

      <div className="panel-body">
        <div className="panel-scroll" ref={scrollRef}>
          {view === 'feed' && (
            <Feed
              items={items}
              members={members}
              meId={me.id}
              mode="feed"
              memberFilter="all"
              starOnly={false}
              query={query}
              onOpenLink={onOpenLink}
              onStar={onStar}
              onExclude={onExclude}
            />
          )}

          {view === 'note' && (
            <NoteList
              items={items}
              members={members}
              meId={me.id}
              memberFilter={memberFilter}
              starOnly={starOnly}
              query={query}
              onStar={onStar}
              onExclude={onExclude}
            />
          )}

          {view === 'people' && (
            <People items={items} members={members} onAddRelation={onAddRelation} />
          )}
          {view === 'keyword' && <Keywords items={items} onCycle={onToggleKeyword} />}
          {view === 'secret' && <Secrets items={items} onToggleVerify={onToggleVerify} />}
          {view === 'timeline' && (
            <Timeline items={items} members={members} onReorder={onReorderTimeline} />
          )}
        </div>

        {compose && (
          <div className="compose">
            <p className="compose-title">{COMPOSE[compose].title}</p>
            {COMPOSE[compose].fields.map((field, index) => (
              <input
                key={field.key}
                className="compose-field"
                autoFocus={index === 0}
                value={index === 0 ? f1 : index === 1 ? f2 : f3}
                placeholder={field.placeholder}
                inputMode={field.key === 'eventAt' ? 'numeric' : undefined}
                onChange={(e) => {
                  const value = e.target.value
                  if (index === 0) setF1(value)
                  else if (index === 1) setF2(value)
                  else setF3(value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitCompose()
                }}
              />
            ))}
            <div className="compose-actions">
              <button type="button" className="compose-cancel" onClick={() => setCompose(null)}>
                取消
              </button>
              <button type="button" className="compose-ok" onClick={submitCompose}>
                {t('modules.add')}
              </button>
            </div>
          </div>
        )}

        {composeKind && (
          <button
            type="button"
            className="fab"
            aria-label={COMPOSE[composeKind].title}
            onClick={() => openCompose(composeKind)}
          >
            +
          </button>
        )}

        <Composer onSend={onSend} hidden={view !== 'feed' && view !== 'note'} />
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
                          {t('room.members.you')}
                        </span>
                      )}
                    </div>
                    <div className="member-sub">
                      {live
                        ? `${t('room.members.live')}《${m.current!.title}》`
                        : `${t('room.members.ago')} ${ago(m.lastSeen)}`}
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
              data-copy="room.members.replay"
              onClick={() => {
                setMembersOpen(false)
                onReplayOnboarding()
              }}
            >
              {t('room.members.replay')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
