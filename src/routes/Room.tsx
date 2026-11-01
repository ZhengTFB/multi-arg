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
import type { FrameAlert } from '../components/GameFrame'
import { BrowserTabs } from '../components/BrowserTabs'
import { fromProxyUrl, hostOf, toProxyUrl } from '../lib/proxy'
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
  const [shareDraft, setShareDraft] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(() => !has('guide'))
  const [unread] = useState<Set<string>>(() => new Set())
  // 页面里翻到哪一页（由被代理页回传，代理之后是真实长地址）
  const [liveUrl, setLiveUrl] = useState('')
  const [liveTitle, setLiveTitle] = useState('')
  // 不是网页的链接（mailto: 等）拦下来提示一句
  const [blocked, setBlocked] = useState<{ url: string } | null>(null)
  // 代理抓不动的站点退回直连（跨域，读不到地址但仍可用）
  const [directHosts, setDirectHosts] = useState<Set<string>>(() => new Set())

  const socket = useRef<RoomSocket | null>(null)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const liveH = useRef(0)
  const skipClick = useRef(false)

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  const activeUrl = activeTab?.url ?? ''
  /** 给用户的真实地址：页面里翻页之后以回传的为准 */
  const currentUrl = liveUrl || activeUrl
  /** 给 iframe 的地址：默认走同源代理，抓不动的站退回直连 */
  const frameSrc = !activeUrl
    ? ''
    : directHosts.has(hostOf(activeUrl))
      ? activeUrl
      : toProxyUrl(activeUrl)

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

  // 换标签、换地址之后等页面自己重新报位置
  useEffect(() => {
    setLiveUrl('')
    setLiveTitle('')
    setBlocked(null)
  }, [activeId, activeUrl])

  // 上报「正在看哪一页」（存真实地址，不存 /p 代理前缀）
  useEffect(() => {
    if (!room || !currentUrl) return
    const timer = window.setTimeout(() => {
      socket.current?.send({ t: 'presence', title: liveTitle || activeTab?.title || '', url: currentUrl })
    }, 600)
    return () => window.clearTimeout(timer)
  }, [currentUrl, liveTitle, room, activeTab])

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

  // 被代理页回传：翻到哪一页、点了什么链接 —— 一切点击都在房间里解决
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | { __arg?: number; t?: string; url?: string; title?: string; blank?: boolean }
        | null
      if (!data || typeof data !== 'object' || data.__arg !== 1) return

      if (data.t === 'url' && typeof data.url === 'string') {
        setLiveUrl(fromProxyUrl(data.url))
        if (data.title) setLiveTitle(data.title)
        return
      }

      if (data.t === 'navigate' && typeof data.url === 'string') {
        const target = fromProxyUrl(data.url)
        if (!/^https?:/i.test(target)) return
        const host = hostOf(target)
        // 本来要开新窗口的（target=_blank / window.open / ctrl+点击）→ 我们自己的标签页
        if (data.blank || (host && host !== hostOf(activeUrl))) {
          openTab(target, host)
          return
        }
        // 又点了当前这一页：重载一下，别让人以为点了没反应
        if (target === currentUrl) {
          reloadFrame()
          return
        }
        navigate(target, host)
        return
      }

      if (data.t === 'blocked' && typeof data.url === 'string' && data.url) {
        setBlocked({ url: data.url })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [activeUrl, currentUrl, navigate, openTab, reloadFrame])

  const openLink = useCallback(
    (item: Item) => {
      if (!item.url) return
      const url = new URL(item.url, location.origin).href
      // 同一个地址：不新开标签，直接重载当前框，否则看起来像「点了没反应」
      if (url === activeTab?.url) {
        reloadFrame()
        return
      }
      openTab(url, item.title)
    },
    [activeTab?.url, openTab, reloadFrame],
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
      const base = { pageUrl: currentUrl }

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
            type: 'msg',
            ...base,
            text: rest.join(' ') || text,
            mentions: target ? [target.id] : [],
          },
        })
        return
      }

      socket.current?.send({ t: 'item.add', item: { type: 'msg', ...base, text } })
    },
    [currentUrl, members],
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
        pageUrl: currentUrl,
      })
    },
    [currentUrl, room, addItem],
  )

  /** 走代理时 iframe 与主页面同源，能读到它真正停在哪一页（顺手把 /p 前缀还原成原站地址） */
  const readFrameUrl = useCallback((): string | null => {
    try {
      const frame = document.querySelector<HTMLIFrameElement>('.frame-body iframe')
      const href = frame?.contentWindow?.location.href
      if (!href || href === 'about:blank') return null
      return fromProxyUrl(href)
    } catch {
      return null
    }
  }, [])

  const doShare = useCallback(
    (url: string, title: string) => {
      addItem({ type: 'link', url, title, pageUrl: url })
      showNotice({ id: `pending-${Date.now()}`, authorName: me?.name ?? '我', title })
    },
    [addItem, me?.name, showNotice],
  )

  const sharePage = useCallback(() => {
    if (!activeTab) return
    // 代理之后地址是读得到的：直接分享用户眼前这一页的真实长地址
    const real = readFrameUrl() || liveUrl
    if (real) {
      doShare(real, liveTitle || activeTab.title || hostOf(real))
      return
    }
    // 只有直连（跨域）才读不到，这时才让用户粘一次
    setShareDraft(activeUrl)
  }, [activeTab, activeUrl, doShare, liveTitle, liveUrl, readFrameUrl])

  /** 只有 mailto: / tel: 这类不是网页的链接才拦下来提示一句 */
  const frameAlert: FrameAlert | null = blocked && {
    title: '这个链接不是网页',
    hint: `${blocked.url} —— 这类链接只能交给系统处理，房间里的框打不开它。`,
    actions: [{ label: '知道了', onClick: () => setBlocked(null) }],
  }

  // 代理抓不到目标站（要登录、拒绝抓取），这个站退回直连
  const onProxyFail = useCallback(() => {
    const host = hostOf(activeTab?.url ?? '')
    if (!host) return
    setDirectHosts((prev) => {
      const next = new Set(prev)
      next.add(host)
      return next
    })
  }, [activeTab?.url])

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
      liveUrl={liveUrl}
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
    onAddRelation: (from: string, to: string, label: string) =>
      addItem({ type: 'person', relations: [{ from, to, label }] }),
    onAddNote: (text: string) => addItem({ type: 'note', text }),
    onReorderTimeline: (ids: string[]) => {
      ids.forEach((id, index) => socket.current?.send({ t: 'item.patch', id, patch: { order: index } }))
    },
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

  const guideModal = !guideOpen ? null : (
    <div className="share-dialog" role="dialog" aria-modal="true">
      <p className="share-dialog-title">两个常用操作</p>
      <p className="share-dialog-hint">
        <b>换页 / 访问新链接</b>：点顶部的地址栏，输入或粘贴网址后回车；左边箭头是返回上一页，右边圆圈是刷新。
      </p>
      <p className="share-dialog-hint">
        <b>分享给同房间的人</b>：点右上角「分享此页」，眼前这一页（带完整路径）会作为卡片发进聊天，别人点一下就到同一页。
      </p>
      <p className="share-dialog-hint">
        <b>游戏里的链接</b>：站内翻页就在当前框里走；本来要开新窗口的链接（含站外站），会开成我们自己的标签页，
        不会把你甩到系统浏览器里去。
      </p>
      <div className="share-dialog-actions">
        <button
          type="button"
          className="share-dialog-ok"
          onClick={() => {
            save('guide', true)
            setGuideOpen(false)
          }}
        >
          知道了
        </button>
      </div>
    </div>
  )

  const shareDialog = shareDraft === null ? null : (
    <div className="share-dialog" role="dialog" aria-modal="true">
      <p className="share-dialog-title">分享哪一页？</p>
      <p className="share-dialog-hint">
        这个站没能走代理，读不到它内部的网址。翻到哪页就把那页地址粘进来，别人点卡片才会落到同一处。
      </p>
      <input
        value={shareDraft}
        autoFocus
        spellCheck={false}
        onChange={(e) => setShareDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const url = shareDraft.trim()
            if (url) doShare(url, hostOf(url))
            setShareDraft(null)
          }
          if (e.key === 'Escape') setShareDraft(null)
        }}
      />
      <div className="share-dialog-quick">
        <button
          type="button"
          onClick={() => {
            const url = shareDraft.trim()
            if (!url) return
            navigator.clipboard?.writeText(url).catch(() => {})
          }}
        >
          复制链接
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              const text = (await navigator.clipboard.readText()).trim()
              if (!text) return
              const url = /^https?:\/\//i.test(text) ? text : `https://${text}`
              doShare(url, hostOf(url))
              setShareDraft(null)
            } catch {
              /* 浏览器不给读剪贴板就手动粘 */
            }
          }}
        >
          粘贴并分享
        </button>
      </div>
      <div className="share-dialog-actions">
        <button type="button" className="share-dialog-cancel" onClick={() => setShareDraft(null)}>
          取消
        </button>
        <button
          type="button"
          className="share-dialog-ok"
          onClick={() => {
            const url = shareDraft.trim()
            if (url) doShare(url, hostOf(url))
            setShareDraft(null)
          }}
        >
          分享
        </button>
      </div>
    </div>
  )

  if (phone) {
    return (
      <div className="room room--phone" data-immersive={immersive || undefined}>
        <GameFrame
          src={frameSrc}
          phone
          reloadKey={frameKey}
          stuck={stuck}
          chrome={immersive ? undefined : chrome}
          alert={frameAlert}
          onProxyFail={onProxyFail}
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

        {shareDialog}
      {guideModal}
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
        alert={frameAlert}
        onProxyFail={onProxyFail}
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

      {shareDialog}
      {guideModal}
        <Invite room={room} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
