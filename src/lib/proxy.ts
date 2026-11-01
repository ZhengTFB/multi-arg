/**
 * 游戏页统一走同源代理 `/p/<scheme>/<host>/<path>`。
 * 代理之后 iframe 与主页面同源：地址读得到（分享才带得上长路径），
 * 页面里的点击也能被服务端注入的桥接脚本拦下来。
 */

const PROXY_PATH = /^\/p\/(https?)\/([^/]+)(\/[^]*)?$/

/** 远程地址 → 代理地址；已经是我们自己的地址就不动 */
export function toProxyUrl(raw: string): string {
  try {
    const url = new URL(raw, location.origin)
    if (url.origin === location.origin) return url.href
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return url.href
    const scheme = url.protocol.slice(0, -1)
    return `${location.origin}/p/${scheme}/${url.host}${url.pathname}${url.search}${url.hash}`
  } catch {
    return raw
  }
}

/** 代理地址 → 远程地址；不是代理地址原样返回 */
export function fromProxyUrl(raw: string): string {
  try {
    const url = new URL(raw, location.origin)
    if (url.origin !== location.origin) return url.href
    const hit = url.pathname.match(PROXY_PATH)
    if (!hit) return url.href
    return `${hit[1]}://${hit[2]}${hit[3] || '/'}${url.search}${url.hash}`
  } catch {
    return raw
  }
}

export function isProxyUrl(raw: string): boolean {
  try {
    const url = new URL(raw, location.origin)
    return url.origin === location.origin && PROXY_PATH.test(url.pathname)
  } catch {
    return false
  }
}

/** 只留 host + path，给地址栏显示 */
export function prettyUrl(raw: string): string {
  try {
    const url = new URL(fromProxyUrl(raw), location.origin)
    const path = url.pathname === '/' ? '' : url.pathname
    return `${url.host.replace(/^www\./, '')}${path}${url.search}`
  } catch {
    return raw
  }
}

export function hostOf(raw: string): string {
  try {
    return new URL(fromProxyUrl(raw), location.origin).host.replace(/^www\./, '')
  } catch {
    return raw
  }
}
