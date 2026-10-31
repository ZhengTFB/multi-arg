import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown, MessageSquare } from 'lucide-react'
import type { Item, ModuleKey } from '../lib/types'
import { mockItems, mockMembers, mockRoom, MOCK_ME } from '../lib/mock'
import { load, save, has } from '../lib/storage'
import { t } from '../lib/copy'
import { GameFrame } from '../components/GameFrame'
import { EdgeRail } from '../components/EdgeRail'
import type { RailAction } from '../components/EdgeRail'
import { Panel } from '../components/Panel'
import type { ShareNotice, View } from '../components/Panel'
import { Invite } from '../components/Invite'

interface Props {
  id: string
  token: string
}

type DrawerLevel = 'closed' | 'half' | 'full'

const PHONE_QUERY = '(max-width: 767px), (orientation: portrait)'

export function Room({ id, token }: Props) {
  const room = useMemo(() => {
    const base = mockRoom(id)
    const mods = load<ModuleKey[]>('modules', base.modules)
    return { ...base, modules: mods.length ? mods : base.modules }
  }, [id])
  const members = useMemo(() => {
    const list = mockMembers()
    const savedName = load<string>('name', '')
    if (!savedName) return list
    return list.map((m) => (m.id === MOCK_ME ? { ...m, name: savedName } : m))
  }, [])
  const me = members.find((m) => m.id === MOCK_ME) ?? members[0]

  const [items, setItems] = useState<Item[]>(() => mockItems())
  const [view, setView] = useState<View>('feed')
  const [panelOpen, setPanelOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [level, setLevel] = useState<DrawerLevel>('closed')
  const [dragH, setDragH] = useState<number | null>(null)
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  const [vh, setVh] = useState(() => window.innerHeight)
  const [frameSrc, setFrameSrc] = useState(room.game.url)
  const [backVisible, setBackVisible] = useState(false)
  const [flash, setFlash] = useState(0)
  const [conn, setConn] = useState<'ok' | 'off' | null>(() => (navigator.onLine ? null : 'off'))
  const [immersive, setImmersive] = useState(false)
  const [coachOpen, setCoachOpen] = useState(() => !has('coach'))
  const [notice, setNotice] = useState<ShareNotice | null>(null)

  const stack = useRef<string[]>([])
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const liveH = useRef(0)
  const skipClick = useRef(false)
  const [unread] = useState<Set<string>>(() => new Set(['m3']))

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
    document.title = `${room.game.title} · 多人 ARG`
  }, [room.game.title])

  // Phase 2 会由 WebSocket 驱动同一根窄条，这里先用浏览器联网状态兜住
  useEffect(() => {
    const off = () => setConn('off')
    const on = () => {
      setConn('ok')
      window.setTimeout(() => setConn(null), 1500)
    }
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => {
      window.removeEventListener('offline', off)
      window.removeEventListener('online', on)
    }
  }, [])

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

  const bumpFlash = useCallback(() => setFlash((n) => n + 1), [])

  const push = useCallback(
    (item: Item) => {
      setItems((prev) => [...prev, item])
      bumpFlash()
    },
    [bumpFlash],
  )

  const openPanel = useCallback(() => {
    setImmersive(false)
    setPanelOpen(true)
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
      const param = room.game.searchParam || 'q'
      setFrameSrc(`${room.game.url}?${param}=${encodeURIComponent(q)}`)
      setBackVisible(false)
    },
    [room.game.url, room.game.searchParam],
  )

  const addText = useCallback(
    (text: string) => {
      const now = Date.now()
      const base = { authorId: me.id, createdAt: now, pageUrl: frameSrc }

      const kw = text.match(/^词\s+(.+)$/)
      if (kw) {
        const [word, tail] = kw[1].split(/[=＝]/)
        push({
          id: `n${now}`,
          type: 'keyword',
          ...base,
          keyword: (word ?? '').trim(),
          result: (tail ?? '').includes('无效')
            ? 'invalid'
            : (tail ?? '').includes('未')
              ? 'miss'
              : 'hit',
        })
        // 记进去的内容在对应模块里，直接切过去，省得用户以为没发出去
        setView('keyword')
        return
      }

      const sec = text.match(/^密\s+(.+)$/)
      if (sec) {
        const [account, password, usage] = sec[1].split('/').map((s) => s.trim())
        push({
          id: `n${now}`,
          type: 'secret',
          ...base,
          secret: { account: account ?? '', password: password ?? '', usage, verified: false },
        })
        setView('secret')
        return
      }

      if (text.startsWith('@')) {
        const [who, ...rest] = text.slice(1).split(/\s+/)
        const target = members.find((m) => m.name === who)
        push({
          id: `n${now}`,
          type: 'note',
          ...base,
          text: rest.join(' ') || text,
          mentions: target ? [target.id] : [],
        })
        return
      }

      push({ id: `n${now}`, type: 'note', ...base, text })
    },
    [frameSrc, me.id, members, push],
  )

  const onStar = useCallback((item: Item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, starred: !i.starred } : i)))
  }, [])

  const onExclude = useCallback((item: Item) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, status: i.status === 'excluded' ? 'open' : ('excluded' as Item['status']) }
          : i,
      ),
    )
  }, [])

  // 未尝试 → 有效 → 无效 → 未尝试
  const onToggleKeyword = useCallback((item: Item) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== item.id) return i
        const next = i.result === 'hit' ? 'invalid' : i.result === 'invalid' ? 'miss' : 'hit'
        return { ...i, result: next }
      }),
    )
  }, [])

  const onToggleVerify = useCallback((item: Item) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id && i.secret
          ? { ...i, secret: { ...i.secret, verified: !i.secret.verified } }
          : i,
      ),
    )
  }, [])

  const onAddKeyword = useCallback(
    (word: string, result: 'hit' | 'miss' | 'invalid') => {
      push({
        id: `k${Date.now()}`,
        type: 'keyword',
        authorId: me.id,
        createdAt: Date.now(),
        keyword: word,
        result,
      })
    },
    [me.id, push],
  )

  const onSaveKeyword = useCallback(
    (q: string) => {
      if (!q) return
      onAddKeyword(q, 'miss')
    },
    [onAddKeyword],
  )

  const onShareResult = useCallback(
    (q: string) => {
      push({
        id: `l${Date.now()}`,
        type: 'link',
        authorId: me.id,
        createdAt: Date.now(),
        url: `${room.game.url}?${room.game.searchParam || 'q'}=${encodeURIComponent(q)}`,
        title: `搜索「${q}」`,
        pageUrl: frameSrc,
      })
    },
    [frameSrc, me.id, push, room.game.searchParam, room.game.url],
  )

  const sharePage = useCallback(() => {
    const now = Date.now()
    const id = `l${now}`
    const title = frameSrc.includes('p=duty') ? '值班表' : '店内环境'
    push({
      id,
      type: 'link',
      authorId: me.id,
      createdAt: now,
      url: frameSrc,
      title,
      pageUrl: frameSrc,
    })
    showNotice({ id, authorName: me.name, title })
  }, [frameSrc, me.id, me.name, push, showNotice])

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
      if (action === 'modules') setView(room.modules.includes('person') ? 'people' : 'keyword')
      if (action === 'note') {
        window.setTimeout(() => {
          document.querySelector<HTMLElement>('[data-composer]')?.focus()
        }, 420)
      }
    },
    [room.modules, sharePage, openPanel],
  )

  // 模块视图在手机上需要更多高度，切过去就顶到最高
  const changeView = useCallback(
    (next: View) => {
      setView(next)
      if (phone && next !== 'feed' && next !== 'note') setLevel('full')
    },
    [phone],
  )

  const HALF = 0.62
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
      // 往下拖得多就是关，拖一点点就从满高回到半高
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

  const latest = items.filter((i) => i.type !== 'system').slice(-1)[0]
  const latestAuthor = latest ? members.find((m) => m.id === latest.authorId) : undefined
  const latestText = latest?.title ?? latest?.text ?? latest?.keyword ?? ''

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
            room={room}
            members={members}
            items={items}
            me={me}
            view={view}
            onView={changeView}
            variant="drawer"
            open
            conn={conn}
            unread={unread}
            onOpenInvite={() => setInviteOpen(true)}
            onImmersive={() => setLevel('closed')}
            onOpenLink={openLink}
            onStar={onStar}
            onExclude={onExclude}
            onSend={addText}
            onSearchInGame={searchInGame}
            onSaveKeyword={onSaveKeyword}
            onShareResult={onShareResult}
            onAddKeyword={onAddKeyword}
            onToggleKeyword={onToggleKeyword}
            onToggleVerify={onToggleVerify}
            onReplayOnboarding={() => {
              save('coach', false)
              setCoachOpen(true)
            }}
            notice={notice}
            onSharePage={sharePage}
            onOpenNotice={() => {
              const target = items.find((i) => i.id === notice?.id)
              if (target) openLink(target)
              setNotice(null)
            }}
            onDismissNotice={() => setNotice(null)}
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

        <Invite
          room={room}
          token={token || 'demo'}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
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
        room={room}
        members={members}
        items={items}
        me={me}
        view={view}
        onView={changeView}
        variant="side"
        open={panelOpen}
        conn={conn}
        unread={unread}
        onOpenInvite={() => setInviteOpen(true)}
        onImmersive={() => {
          setPanelOpen(false)
          setImmersive(true)
        }}
        onOpenLink={openLink}
        onStar={onStar}
        onExclude={onExclude}
        onSend={addText}
        onSearchInGame={searchInGame}
        onSaveKeyword={onSaveKeyword}
        onShareResult={onShareResult}
        onAddKeyword={onAddKeyword}
        onToggleKeyword={onToggleKeyword}
        onToggleVerify={onToggleVerify}
        onReplayOnboarding={() => {
          save('coach', false)
          setCoachOpen(true)
        }}
        notice={notice}
        onSharePage={sharePage}
        onOpenNotice={() => {
          const target = items.find((i) => i.id === notice?.id)
          if (target) openLink(target)
          setNotice(null)
        }}
        onDismissNotice={() => setNotice(null)}
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

      <Invite
        room={room}
        token={token || 'demo'}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  )
}
