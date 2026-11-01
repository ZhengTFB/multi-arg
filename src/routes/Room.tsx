import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown, MessageSquare } from 'lucide-react'
import type { Item, Member, Room as RoomInfo } from '../lib/types'
import { load, save, has } from '../lib/storage'
import { t } from '../lib/copy'
import { fetchState, joinRoom, RoomSocket } from '../lib/net'
import type { RoomState } from '../lib/net'
import { loadSession, saveSession } from '../lib/session'
import { GameFrame } from '../components/GameFrame'
import { BrowserTabs } from '../components/BrowserTabs'
import type { Tab } from '../components/BrowserTabs'
import { NameGate } from '../components/NameGate'
import { EdgeRail } from '../components/EdgeRail'
import type { RailAction } from '../components/EdgeRail'
import { Panel } from '../components/Panel'
import type { ShareNotice, View } from '../components/Panel'
import { Invite } from '../components/Invite'

interface Props {
  id: string
}

type DrawerLevel = 'closed' | 'half' | 'full'

const PHONE_QUERY = '(max-width: 767px), (orientation: portrait)'
const HALF = 0.62

export function Room({ id }: Props) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [me, setMe] = useState<Member | null>(null)
  const [phase, setPhase] = useState<'loading' | 'name' | 'ready' | 'missing'>('loading')
  const [bootKey, setBootKey] = useState(0)

  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState('')
  const [histories, setHistories] = useState<Record<string, string[]>>({})
  const [frameKey, setFrameKey] = useState(0)
  const [stuck, setStuck] = useState(false)
  const loaded = useRef(false)

  const [view, setView] = useState<View>('feed')
  const [panelOpen, setPanelOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [level, setLevel] = useState<DrawerLevel>('closed')
  const [dragH, setDragH] = useState<number | null>(null)
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  const [vh, setVh] = useState(() => window.innerHeight)
  const [flash, setFlash] = useState(0)
  const [conn, setConn] = useState<'ok' | 'off' | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [coachOpen, setCoachOpen] = useState(() => !has('coach'))
  const [notice, setNotice] = useState<ShareNotice | null>(null)
  const [unread] = useState<Set<string>>(() => new Set())

  const socket = useRef<RoomSocket | null>(null)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const liveH = useRef(0)
  const skipClick = useRef(false)

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  const frameSrc = activeTab?.url ?? ''

  // 起名之后重新走一遍进房流程
  useEffect(() => {
    let alive = true

    const boot = async () => {
      const session = loadSession(id)
      const savedName = load<string>('name', '').trim()

      if (!session && !savedName) {
        setPhase('name')
        return
      }

      let state: RoomState | null = null
      if (session) state = await fetchState(id, session.id).catch(() => null)
      if (!state) state = await joinRoom(id, savedName).catch(() => null)

      if (!alive) return
      if (!state) {
        setPhase('missing')
        return
      }

      saveSession(id, { id: state.member.id, name: state.member.name })
      setRoom(state.room)
      setMembers(state.members)
      setItems(state.items)
      setMe(state.member)
      setPhase('ready')

      const first: Tab = {
        id: 't1',
        url: state.room.game.url,
        title: state.room.game.title,
      }
      setTabs([first])
      setActiveId(first.id)

      socket.current = new RoomSocket(id, state.member.id, {
        onState: (next) => {
          setRoom(next.room)
          setMembers(next.members)
          setItems(next.items)
        },
        onItem: (item) => {
          setItems((prev) => {
            const index = prev.findIndex((i) => i.id === item.id)
            if (index === -1) return [...prev, item].sort((a, b) => a.createdAt - b.createdAt)
            const next = [...prev]
            next[index] = item
            return next
          })
          setFlash((n) => n + 1)
        },
        onMember: (member) => {
          setMembers((prev) => {
            const index = prev.findIndex((m) => m.id === member.id)
            if (index === -1) return [...prev, member]
            const next = [...prev]
            next[index] = member
            return next
          })
        },
        onStatus: (status) => setConn(status === 'ok' ? 'ok' : 'off'),
        onError: () => {
          /* 只读房间、越权改别人的条目等，静默忽略，界面以服务端回声为准 */
        },
      })
    }

    boot()

    return () => {
      alive = false
      socket.current?.close()
      socket.current = null
    }
  }, [id, bootKey])

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (room) document.title = `${room.game.title} · 多人 ARG`
  }, [room])

  // 进房先把辅助栏打开，省得有人不知道右边有东西
  useEffect(() => {
    if (phase !== 'ready') return
    if (window.matchMedia(PHONE_QUERY).matches) setLevel('half')
    else setPanelOpen(true)
  }, [phase])

  // 上报「正在看哪一页」
  useEffect(() => {
    if (!room || !frameSrc) return
    const timer = window.setTimeout(() => {
      socket.current?.send({ t: 'presence', title: activeTab?.title ?? '', url: frameSrc })
    }, 600)
    return () => window.clearTimeout(timer)
  }, [frameSrc, room, activeTab])

  useEffect(() => {
    if (conn !== 'ok') return
    const timer = window.setTimeout(() => setConn(null), 1500)
    return () => window.clearTimeout(timer)
  }, [conn])

  // 页面 8 秒还没 load 出来，就把刷新按钮亮出来
  useEffect(() => {
    loaded.current = false
    setStuck(false)
    const timer = window.setTimeout(() => {
      if (!loaded.current) setStuck(true)
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [frameSrc, frameKey])

  const dismissCoach = useCallback(() => {
    setCoachOpen(false)
    save('coach', true)
  }, [])

  useEffect(() => {
    if (!coachOpen) return
    const timer = window.setTimeout(dismissCoach, 9000)
    return () => window.clearTimeout(timer)
  }, [coachOpen, dismissCoach])

  const showNotice = useCallback((next: ShareNotice) => {
    setNotice(next)
    window.setTimeout(() => {
      setNotice((cur) => (cur && cur.id === next.id ? null : cur))
    }, 9000)
  }, [])

  const openPanel = useCallback(() => {
    setImmersive(false)
    setPanelOpen(true)
  }, [])

  const patchItem = useCallback((item: Item, patch: Partial<Item>) => {
    socket.current?.send({ t: 'item.patch', id: item.id, patch })
  }, [])

  // —— 标签页 ——

  const setTabUrl = useCallback(
    (tabId: string, url: string, title?: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, url, title: title ?? tab.title ?? hostOf(url) } : tab,
        ),
      )
    },
    [],
  )

  const pushHistory = useCallback((tabId: string, url: string) => {
    setHistories((prev) => {
      const list = prev[tabId] ?? []
      if (list[list.length - 1] === url) return prev
      return { ...prev, [tabId]: [...list, url].slice(-30) }
    })
  }, [])

  const navigate = useCallback(
    (url: string, title?: string) => {
      if (!activeTab) return
      pushHistory(activeTab.id, activeTab.url)
      setTabUrl(activeTab.id, url, title)
    },
    [activeTab, pushHistory, setTabUrl],
  )

  const openTab = useCallback((url: string, title?: string) => {
    setTabs((prev) => {
      const hit = prev.find((tab) => tab.url === url)
      if (hit) {
        setActiveId(hit.id)
        return prev
      }
      const tab: Tab = { id: `t${Date.now()}`, url, title: title || hostOf(url) }
      setActiveId(tab.id)
      return [...prev, tab]
    })
  }, [])

  // 加号：不管有没有同地址都新开一个，方便先把页面备好
  const newTab = useCallback(() => {
    const tab: Tab = {
      id: `t${Date.now()}`,
      url: activeTab?.url ?? room?.game.url ?? '',
      title: activeTab?.title ?? '新标签页',
    }
    setTabs((prev) => [...prev, tab])
    setActiveId(tab.id)
  }, [activeTab, room])

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length === 1) return prev
        const index = prev.findIndex((tab) => tab.id === tabId)
        const next = prev.filter((tab) => tab.id !== tabId)
        if (tabId === activeId) setActiveId(next[Math.max(0, index - 1)].id)
        return next
      })
    },
    [activeId],
  )

  const goBack = useCallback(() => {
    const list = histories[activeId] ?? []
    const prev = list[list.length - 1]
    if (!prev) return
    setHistories((state) => ({ ...state, [activeId]: list.slice(0, -1) }))
    setTabUrl(activeId, prev)
  }, [histories, activeId, setTabUrl])

  const reloadFrame = useCallback(() => {
    loaded.current = false
    setStuck(false)
    setFrameKey((k) => k + 1)
  }, [])

  const openLink = useCallback(
    (item: Item) => {
      if (!item.url) return
      const url = new URL(item.url, location.origin).href
      openTab(url, item.title)
    },
    [openTab],
  )

  const searchInGame = useCallback(
    (q: string) => {
      if (!room) return
      const param = room.game.searchParam || 'q'
      navigate(`${room.game.url}?${param}=${encodeURIComponent(q)}`, `搜索「${q}」`)
    },
    [navigate, room],
  )

  const addText = useCallback(
    (text: string) => {
      const base = { pageUrl: frameSrc }

      const kw = text.match(/^词\s+(.+)$/)
      if (kw) {
        const [word, tail] = kw[1].split(/[=＝]/)
        socket.current?.send({
          t: 'item.add',
          item: {
            type: 'keyword',
            ...base,
            keyword: (word ?? '').trim(),
            result: (tail ?? '').includes('无效')
              ? 'invalid'
              : (tail ?? '').includes('未')
                ? 'miss'
                : 'hit',
          },
        })
        setView('keyword')
        return
      }

      const sec = text.match(/^密\s+(.+)$/)
      if (sec) {
        const [account, password, usage] = sec[1].split('/').map((s) => s.trim())
        socket.current?.send({
          t: 'item.add',
          item: {
            type: 'secret',
            ...base,
            secret: { account: account ?? '', password: password ?? '', usage, verified: false },
          },
        })
        setView('secret')
        return
      }

      if (text.startsWith('@')) {
        const [who, ...rest] = text.slice(1).split(/\s+/)
        const target = members.find((m) => m.name === who)
        socket.current?.send({
          t: 'item.add',
          item: {
            type: 'note',
            ...base,
            text: rest.join(' ') || text,
            mentions: target ? [target.id] : [],
          },
        })
        return
      }

      socket.current?.send({ t: 'item.add', item: { type: 'note', ...base, text } })
    },
    [frameSrc, members],
  )

  const onStar = useCallback(
    (item: Item) => patchItem(item, { starred: !item.starred }),
    [patchItem],
  )

  const onExclude = useCallback(
    (item: Item) => patchItem(item, { status: item.status === 'excluded' ? 'open' : 'excluded' }),
    [patchItem],
  )

  const onToggleKeyword = useCallback(
    (item: Item) => {
      const next = item.result === 'hit' ? 'invalid' : item.result === 'invalid' ? 'miss' : 'hit'
      patchItem(item, { result: next })
    },
    [patchItem],
  )

  const onToggleVerify = useCallback(
    (item: Item) => {
      if (!item.secret) return
      patchItem(item, { secret: { ...item.secret, verified: !item.secret.verified } })
    },
    [patchItem],
  )

  const addItem = useCallback((item: Partial<Item>) => {
    socket.current?.send({ t: 'item.add', item })
  }, [])

  const onSaveKeyword = useCallback(
    (q: string) => {
      if (!q) return
      addItem({ type: 'keyword', keyword: q, result: 'miss' })
    },
    [addItem],
  )

  const onShareResult = useCallback(
    (q: string) => {
      if (!room) return
      addItem({
        type: 'link',
        url: `${room.game.url}?${room.game.searchParam || 'q'}=${encodeURIComponent(q)}`,
        title: `搜索「${q}」`,
        pageUrl: frameSrc,
      })
    },
    [frameSrc, room, addItem],
  )

  const sharePage = useCallback(() => {
    if (!activeTab) return
    addItem({ type: 'link', url: activeTab.url, title: activeTab.title, pageUrl: activeTab.url })
    showNotice({ id: `pending-${Date.now()}`, authorName: me?.name ?? '我', title: activeTab.title })
  }, [activeTab, addItem, me, showNotice])

  useEffect(() => {
    const focus = (selector: string) => {
      window.setTimeout(() => {
        document.querySelector<HTMLElement>(selector)?.focus()
      }, 90)
    }
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (phone) setLevel('full')
        else openPanel()
        focus('[data-search-input]')
        return
      }
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (phone) setLevel('full')
        else openPanel()
        focus('[data-composer]')
        return
      }
      if (e.key === 'Escape') {
        setRailOpen(false)
        setInviteOpen(false)
        if (phone) setLevel('closed')
        else setPanelOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phone, openPanel])

  const handleRail = useCallback(
    (action: RailAction) => {
      if (action === 'sharePage') {
        sharePage()
        return
      }
      if (action === 'invite') {
        setInviteOpen(true)
        return
      }
      openPanel()
      if (action === 'feed') setView('feed')
      if (action === 'modules') setView(room?.modules.includes('person') ? 'people' : 'keyword')
      if (action === 'note') {
        window.setTimeout(() => {
          document.querySelector<HTMLElement>('[data-composer]')?.focus()
        }, 420)
      }
    },
    [room, sharePage, openPanel],
  )

  const changeView = useCallback(
    (next: View) => {
      setView(next)
      if (phone && next !== 'feed' && next !== 'note') setLevel('full')
    },
    [phone],
  )

  const sheetHeight = dragH ?? (level === 'closed' ? 0 : level === 'half' ? vh * HALF : vh * 0.9)

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: e.clientY, startH: sheetHeight }
    liveH.current = sheetHeight
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const next = Math.min(Math.max(d.startH - (e.clientY - d.startY), 0), vh * 0.92)
    liveH.current = next
    setDragH(next)
  }

  const endDrag = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    const h = liveH.current
    const moved = Math.abs(h - d.startH) > 10
    setDragH(null)

    if (!moved) {
      setLevel((cur) => (cur === 'full' ? 'half' : cur === 'half' ? 'full' : 'half'))
      return
    }

    const down = h < d.startH
    if (down) {
      const ratio = (d.startH - h) / Math.max(d.startH, 1)
      if (ratio > 0.38 || h < 60) setLevel('closed')
      else if (d.startH > vh * 0.78) setLevel('half')
      else setLevel(level)
    } else if (h > vh * 0.72) {
      setLevel('full')
    } else if (h > vh * 0.22) {
      setLevel('half')
    } else {
      setLevel('closed')
    }
  }

  const latest = useMemo(
    () => items.filter((i) => i.type !== 'system').slice(-1)[0],
    [items],
  )
  const latestAuthor = latest ? members.find((m) => m.id === latest.authorId) : undefined
  const latestText = latest?.title ?? latest?.text ?? latest?.keyword ?? ''

  if (phase === 'loading') {
    return (
      <div className="page-center">
        <p className="muted" style={{ fontSize: 13 }}>
          正在进房…
        </p>
      </div>
    )
  }

  if (phase === 'name') {
    return (
      <NameGate
        onDone={(name) => {
          save('name', name)
          setPhase('loading')
          setBootKey((k) => k + 1)
        }}
      />
    )
  }

  if (phase === 'missing' || !room || !me || !activeTab) {
    return (
      <div className="page-center">
        <div>
          <h1 className="home-title">{t('app.notfound')}</h1>
          <p className="muted" style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
            房间号 {id} 不存在，或者已经过期了。
          </p>
          <a className="linkish" href="/" style={{ display: 'inline-block', marginTop: 18 }}>
            {t('app.home')}
          </a>
        </div>
      </div>
    )
  }

  const chrome = (
    <BrowserTabs
      tabs={tabs}
      activeId={activeId}
      canBack={(histories[activeId]?.length ?? 0) > 0}
      onSelect={setActiveId}
      onClose={closeTab}
      onNew={newTab}
      onNavigate={(url) => navigate(url)}
      onReload={reloadFrame}
      onBack={goBack}
    />
  )

  const panelProps = {
    room,
    members,
    items,
    me,
    view,
    onView: changeView,
    conn,
    unread,
    onOpenInvite: () => setInviteOpen(true),
    onOpenLink: openLink,
    onStar,
    onExclude,
    onSend: addText,
    onSearchInGame: searchInGame,
    onSaveKeyword,
    onShareResult,
    onAddKeyword: (word: string, result: 'hit' | 'miss' | 'invalid') =>
      addItem({ type: 'keyword', keyword: word, result }),
    onAddPerson: (name: string, note: string) =>
      addItem({ type: 'person', person: { name, note } }),
    onAddEvent: (at: string, text: string) => addItem({ type: 'event', event: { at, text } }),
    onAddSecret: (account: string, password: string, usage: string) =>
      addItem({ type: 'secret', secret: { account, password, usage, verified: false } }),
    onToggleKeyword,
    onToggleVerify,
    onReplayOnboarding: () => {
      save('coach', false)
      setCoachOpen(true)
    },
    notice,
    onSharePage: sharePage,
    onOpenNotice: () => {
      const target = items.find((i) => i.id === notice?.id)
      if (target) openLink(target)
      setNotice(null)
    },
    onDismissNotice: () => setNotice(null),
  }

  if (phone) {
    return (
      <div className="room room--phone" data-immersive={immersive || undefined}>
        <GameFrame
          src={frameSrc}
          phone
          reloadKey={frameKey}
          stuck={stuck}
          chrome={immersive ? undefined : chrome}
          onLoad={() => {
            loaded.current = true
            setStuck(false)
          }}
          onReload={reloadFrame}
        />

        {sheetHeight > 4 && (
          <div
            className="sheet-scrim"
            style={{ opacity: Math.min(0.34, (sheetHeight / vh) * 0.42) }}
            onClick={() => setLevel('closed')}
            role="presentation"
          />
        )}

        <div
          className="drawer"
          data-open={sheetHeight > 4}
          style={{
            height: sheetHeight,
            transition: dragH === null ? 'height 0.34s var(--ease)' : 'none',
          }}
        >
          <div
            className="drawer-handle"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span />
            <button
              type="button"
              className="drawer-close"
              aria-label="关闭"
              onClick={() => setLevel('closed')}
            >
              <ChevronDown size={16} strokeWidth={1.8} />
            </button>
          </div>
          <Panel {...panelProps} variant="drawer" open onImmersive={() => setLevel('closed')} />
        </div>

        <div
          className="conveyor"
          onPointerDown={(e) => {
            dragRef.current = { startY: e.clientY, startH: sheetHeight }
          }}
          onPointerUp={(e) => {
            const d = dragRef.current
            dragRef.current = null
            if (!d) return
            const dy = e.clientY - d.startY
            if (Math.abs(dy) > 16) {
              skipClick.current = true
              window.setTimeout(() => {
                skipClick.current = false
              }, 320)
              setLevel((cur) => (dy < 0 ? (cur === 'closed' ? 'half' : 'full') : 'closed'))
            }
          }}
          onClick={() => {
            if (skipClick.current) return
            setCoachOpen(false)
            setLevel((cur) => (cur === 'closed' ? 'half' : 'full'))
          }}
        >
          <span className="conveyor-name">{latestAuthor?.name ?? ''}</span>
          <span className="conveyor-text">{latestText}</span>
          <span className="conveyor-grip" />
        </div>

        {coachOpen && (
          <button type="button" className="coach" onClick={dismissCoach}>
            <span data-copy="room.coach">{t('room.coach')}</span>
            <ChevronDown size={14} strokeWidth={1.8} />
          </button>
        )}

        <Invite room={room} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      </div>
    )
  }

  return (
    <div className="room" data-immersive={immersive || undefined}>
      <GameFrame
        src={frameSrc}
        phone={false}
        reloadKey={frameKey}
        stuck={stuck}
        chrome={immersive ? undefined : chrome}
        onLoad={() => {
          loaded.current = true
          setStuck(false)
        }}
        onReload={reloadFrame}
      />

      {railOpen && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 18 }}
          onClick={() => setRailOpen(false)}
          role="presentation"
        />
      )}

      <EdgeRail open={railOpen} onToggle={setRailOpen} onAction={handleRail} />

      {flash > 0 && <div className="flash-band" key={flash} />}

      <Panel
        {...panelProps}
        variant="side"
        open={panelOpen}
        onImmersive={() => {
          setPanelOpen(false)
          setImmersive(true)
        }}
      />

      {!panelOpen && !immersive && (
        <button
          type="button"
          className="float-entry"
          aria-label={t('room.immersive.exit')}
          title={t('room.immersive.exit')}
          onClick={openPanel}
        >
          <MessageSquare size={18} strokeWidth={1.6} />
        </button>
      )}

      {immersive && (
        <button
          type="button"
          className="float-entry"
          aria-label={t('room.immersive.exit')}
          title={t('room.immersive.exit')}
          onClick={() => {
            setImmersive(false)
            setPanelOpen(true)
          }}
        >
          <MessageSquare size={18} strokeWidth={1.6} />
        </button>
      )}

      <Invite room={room} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url, location.origin).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
