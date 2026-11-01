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
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing'>('loading')

  const [view, setView] = useState<View>('feed')
  const [panelOpen, setPanelOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [level, setLevel] = useState<DrawerLevel>('closed')
  const [dragH, setDragH] = useState<number | null>(null)
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  const [vh, setVh] = useState(() => window.innerHeight)
  const [frameSrc, setFrameSrc] = useState('')
  const [backVisible, setBackVisible] = useState(false)
  const [flash, setFlash] = useState(0)
  const [conn, setConn] = useState<'ok' | 'off' | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [coachOpen, setCoachOpen] = useState(() => !has('coach'))
  const [notice, setNotice] = useState<ShareNotice | null>(null)
  const [unread] = useState<Set<string>>(() => new Set())

  const socket = useRef<RoomSocket | null>(null)
  const stack = useRef<string[]>([])
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const liveH = useRef(0)
  const skipClick = useRef(false)

  useEffect(() => {
    let alive = true

    const boot = async () => {
      const savedName = load<string>('name', '')
      const session = loadSession(id)
      let state: RoomState | null = null

      if (session) {
        state = await fetchState(id, session.id).catch(() => null)
      }
      if (!state) {
        state = await joinRoom(id, savedName).catch(() => null)
      }
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
      setFrameSrc(state.room.game.url)
      setPhase('ready')

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
          /* 只读房间、越权改别人的条目等，静默忽略，界面状态以服务端回声为准 */
        },
      })
    }

    boot()

    return () => {
      alive = false
      socket.current?.close()
      socket.current = null
    }
  }, [id])

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

  // 上报「正在看哪一页」，别人成员列表里能看到
  useEffect(() => {
    if (!room || !frameSrc) return
    const timer = window.setTimeout(() => {
      socket.current?.send({ t: 'presence', title: pageTitle(frameSrc), url: frameSrc })
    }, 600)
    return () => window.clearTimeout(timer)
  }, [frameSrc, room])

  // 网速提示条：连上后 1.5 秒自己消失
  useEffect(() => {
    if (conn !== 'ok') return
    const timer = window.setTimeout(() => setConn(null), 1500)
    return () => window.clearTimeout(timer)
  }, [conn])

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

  const openLink = useCallback(
    (item: Item) => {
      if (!item.url) return
      const next = new URL(item.url, location.origin).href
      stack.current.push(frameSrc)
      if (stack.current.length > 20) stack.current.shift()
      setFrameSrc(next)
      setBackVisible(true)
      window.setTimeout(() => setBackVisible(false), 3000)
    },
    [frameSrc],
  )

  const goBack = useCallback(() => {
    const prev = stack.current.pop()
    if (prev) setFrameSrc(prev)
    setBackVisible(false)
  }, [])

  const searchInGame = useCallback(
    (q: string) => {
      const param = room?.game.searchParam || 'q'
      setFrameSrc(`${room?.game.url ?? ''}?${param}=${encodeURIComponent(q)}`)
      setBackVisible(false)
    },
    [room],
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

  const onAddKeyword = useCallback((word: string, result: 'hit' | 'miss' | 'invalid') => {
    socket.current?.send({ t: 'item.add', item: { type: 'keyword', keyword: word, result } })
  }, [])

  const onSaveKeyword = useCallback(
    (q: string) => {
      if (!q) return
      onAddKeyword(q, 'miss')
    },
    [onAddKeyword],
  )

  const onShareResult = useCallback(
    (q: string) => {
      socket.current?.send({
        t: 'item.add',
        item: {
          type: 'link',
          url: `${room?.game.url ?? ''}?${room?.game.searchParam || 'q'}=${encodeURIComponent(q)}`,
          title: `搜索「${q}」`,
          pageUrl: frameSrc,
        },
      })
    },
    [frameSrc, room],
  )

  const sharePage = useCallback(() => {
    const title = pageTitle(frameSrc)
    socket.current?.send({
      t: 'item.add',
      item: { type: 'link', url: frameSrc, title, pageUrl: frameSrc },
    })
    showNotice({ id: `pending-${Date.now()}`, authorName: me?.name ?? '我', title })
  }, [frameSrc, me])

  // 键盘：⌘K 搜索、⌘N 记一笔、Esc 收起
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

  if (phase === 'missing' || !room || !me) {
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
    onAddKeyword,
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
      <div className="room room--phone">
        <GameFrame src={frameSrc} phone backVisible={backVisible} onBack={goBack} />

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
          <Panel
            {...panelProps}
            variant="drawer"
            open
            onImmersive={() => setLevel('closed')}
          />
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
      <GameFrame src={frameSrc} phone={false} backVisible={backVisible} onBack={goBack} />

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

      {!panelOpen && (
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

      <Invite room={room} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

function pageTitle(url: string): string {
  if (!url) return '游戏'
  if (/p=duty/.test(url)) return '值班表'
  if (/forum/.test(url)) return '论坛'
  return '店内环境'
}
