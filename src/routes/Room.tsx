import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Item, ModuleKey } from '../lib/types'
import { mockItems, mockMembers, mockRoom, MOCK_ME } from '../lib/mock'
import { load, save, has } from '../lib/storage'
import { GameFrame } from '../components/GameFrame'
import { EdgeRail } from '../components/EdgeRail'
import type { RailAction } from '../components/EdgeRail'
import { Panel } from '../components/Panel'
import type { View } from '../components/Panel'
import { Invite } from '../components/Invite'
import { Onboarding } from '../components/Onboarding'

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
  const [drawer, setDrawer] = useState<DrawerLevel>('closed')
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  const [frameSrc, setFrameSrc] = useState(room.game.url)
  const [backVisible, setBackVisible] = useState(false)
  const [flash, setFlash] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLeaving, setHintLeaving] = useState(false)
  const [breathe, setBreathe] = useState(false)
  const [conn, setConn] = useState<'ok' | 'off' | null>(() => (navigator.onLine ? null : 'off'))

  const stack = useRef<string[]>([])
  const dragY = useRef<number | null>(null)
  const skipClick = useRef(false)
  const [seen, setSeen] = useState<Set<string>>(() => new Set(load<string[]>('seen', [])))
  const [unread] = useState<Set<string>>(() => new Set(['m3']))

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
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

  const runOnboarding = useCallback(() => {
    setBreathe(false)
    setHint(null)
    setHintLeaving(false)
    const timers = [
      window.setTimeout(() => setBreathe(true), 400),
      window.setTimeout(() => {
        if (phone) return
        setRailOpen(true)
      }, 1000),
      window.setTimeout(() => {
        if (phone) return
        setRailOpen(false)
      }, 2500),
      window.setTimeout(() => {
        setHint(phone ? '往上滑，能看到大家发的东西。' : '从右边划一下，能看到大家发的东西。')
      }, 1000),
      window.setTimeout(() => setHintLeaving(true), 6000),
      window.setTimeout(() => setHint(null), 6700),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [phone])

  useEffect(() => {
    if (has('onboarded')) return
    const stop = runOnboarding()
    const done = window.setTimeout(() => save('onboarded', true), 6800)
    return () => {
      stop()
      window.clearTimeout(done)
    }
    // 只在进房时演示一次
  }, [])

  const bumpFlash = useCallback(() => setFlash((n) => n + 1), [])

  const push = useCallback((item: Item) => {
    setItems((prev) => [...prev, item])
    bumpFlash()
  }, [bumpFlash])

  const openLink = useCallback(
    (item: Item) => {
      if (!item.url) return
      const next = new URL(item.url, location.origin).href
      stack.current.push(frameSrc)
      if (stack.current.length > 20) stack.current.shift()
      setFrameSrc(next)
      setBackVisible(true)
      window.setTimeout(() => setBackVisible(false), 3000)
      setSeen((prev) => {
        const nextSet = new Set(prev)
        nextSet.add(item.id)
        save('seen', [...nextSet])
        return nextSet
      })
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
          result: (tail ?? '').includes('未') ? 'miss' : 'hit',
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

  const onToggleKeyword = useCallback((item: Item) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, result: i.result === 'hit' ? 'miss' : 'hit' } : i,
      ),
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
    (word: string, result: 'hit' | 'miss') => {
      push({ id: `k${Date.now()}`, type: 'keyword', authorId: me.id, createdAt: Date.now(), keyword: word, result })
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

  // 键盘：⌘K 搜索、⌘N 记一笔、Esc 收起
  useEffect(() => {
    const focus = (selector: string) => {
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(selector)
        el?.focus()
      }, 90)
    }
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (phone) setDrawer('full')
        else setPanelOpen(true)
        focus('[data-search-input]')
        return
      }
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (phone) setDrawer('full')
        else setPanelOpen(true)
        focus('[data-composer]')
        return
      }
      if (e.key === 'Escape') {
        setRailOpen(false)
        setInviteOpen(false)
        if (phone) setDrawer('closed')
        else setPanelOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phone])

  const handleRail = useCallback(
    (action: RailAction) => {
      if (action === 'pin') {
        push({
          id: `l${Date.now()}`,
          type: 'link',
          authorId: me.id,
          createdAt: Date.now(),
          url: frameSrc,
          title: '店内环境',
          pageUrl: frameSrc,
        })
        return
      }
      if (action === 'share') {
        setInviteOpen(true)
        return
      }
      setPanelOpen(true)
      if (action === 'feed') setView('feed')
      if (action === 'modules') setView(room.modules.includes('person') ? 'people' : 'keyword')
      if (action === 'note') {
        window.setTimeout(() => {
          document.querySelector<HTMLElement>('[data-composer]')?.focus()
        }, 420)
      }
    },
    [frameSrc, me.id, push, room.modules],
  )

  const swiped = (e: ReactPointerEvent, direction: 'up' | 'down' | 'both') => {
    if (dragY.current === null) return
    const dy = e.clientY - dragY.current
    dragY.current = null
    if (Math.abs(dy) > 16) {
      skipClick.current = true
      window.setTimeout(() => {
        skipClick.current = false
      }, 320)
    }
    if (dy < -16) setDrawer((d) => (d === 'closed' ? 'half' : 'full'))
    else if (dy > 16 && direction !== 'up') setDrawer((d) => (d === 'full' ? 'half' : 'closed'))
  }

  const latest = items.filter((i) => i.type !== 'system').slice(-1)[0]
  const latestAuthor = latest ? members.find((m) => m.id === latest.authorId) : undefined
  const latestText = latest?.title ?? latest?.text ?? latest?.keyword ?? ''

  if (phone) {
    return (
      <div className="room room--phone">
        <GameFrame src={frameSrc} phone backVisible={backVisible} onBack={goBack} />

        <div className="drawer" data-level={drawer}>
          <div
            className="drawer-handle"
            onPointerDown={(e) => {
              dragY.current = e.clientY
            }}
            onPointerUp={(e) => swiped(e, 'both')}
          >
            <span />
          </div>
          <Panel
            room={room}
            members={members}
            items={items}
            me={me}
            view={view}
            onView={setView}
            variant="drawer"
            open
            conn={conn}
            seen={seen}
            unread={unread}
            onOpenInvite={() => setInviteOpen(true)}
            onCloseDrawer={() => setDrawer('closed')}
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
              save('onboarded', false)
              runOnboarding()
            }}
          />
        </div>

        <div
          className="conveyor"
          data-nudge={breathe || undefined}
          onPointerDown={(e) => {
            dragY.current = e.clientY
          }}
          onPointerUp={(e) => swiped(e, 'up')}
          onClick={() => {
            if (skipClick.current) return
            setDrawer((d) => (d === 'closed' ? 'half' : 'full'))
          }}
        >
          <span className="conveyor-name">{latestAuthor?.name ?? ''}</span>
          <span className="conveyor-text">{latestText}</span>
          <span className="conveyor-grip" />
        </div>

        <Invite room={room} token={token || 'demo'} open={inviteOpen} onClose={() => setInviteOpen(false)} />
        <Onboarding text={hint} leaving={hintLeaving} />
      </div>
    )
  }

  return (
    <div className="room">
      <GameFrame src={frameSrc} phone={false} backVisible={backVisible} onBack={goBack} />

      {railOpen && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 18 }}
          onClick={() => setRailOpen(false)}
          role="presentation"
        />
      )}

      <EdgeRail open={railOpen} breath={breathe} onToggle={setRailOpen} onAction={handleRail} />

      {flash > 0 && <div className="flash-band" key={flash} />}

      <Panel
        room={room}
        members={members}
        items={items}
        me={me}
        view={view}
        onView={setView}
        variant="side"
        open={panelOpen}
        conn={conn}
        seen={seen}
        unread={unread}
        onOpenInvite={() => setInviteOpen(true)}
        onCloseDrawer={() => setPanelOpen(false)}
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
          save('onboarded', false)
          setPanelOpen(false)
          runOnboarding()
        }}
      />

      <Invite room={room} token={token || 'demo'} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <Onboarding text={hint} leaving={hintLeaving} />
    </div>
  )
}
