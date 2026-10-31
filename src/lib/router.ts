import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'setup'; url: string; preset: string }
  | { name: 'room'; id: string; token: string }
  | { name: 'unknown' }

function parse(pathname: string, search: string, hash: string): Route {
  const query = new URLSearchParams(search)
  const room = pathname.match(/^\/r\/(\d{4})\/?$/)
  if (room) return { name: 'room', id: room[1], token: hash.replace(/^#/, '') }
  if (pathname === '/setup') {
    return { name: 'setup', url: query.get('u') ?? '', preset: query.get('preset') ?? '' }
  }
  if (pathname === '/' || pathname === '') return { name: 'home' }
  return { name: 'unknown' }
}

export function readRoute(): Route {
  return parse(location.pathname, location.search, location.hash)
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const current = location.pathname + location.search + location.hash
  if (current === to) return
  if (opts.replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)
  useEffect(() => {
    const onPop = () => setRoute(readRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return route
}

/** 8 位数字（4 位房间号 + 4 位口令）在输入框里自动分组，粘贴邀请码也认。 */
export function formatRoomCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits
}
