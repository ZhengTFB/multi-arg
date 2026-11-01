/**
 * 同源代理：把外部游戏页面挂到我们自己的域名下面（`/p/https/host/path`）。
 *
 * 为什么要这一层：
 * - 跨域 iframe 里父页面读不到 `contentWindow.location`，分享只能分享域名；
 * - 跨域 iframe 里的 `target="_blank"` / `window.open` 父页面拦不住，用户一点就被甩出房间。
 *
 * 挂到同源之后两个问题一起解决：地址可读、点击可拦（拦截脚本由本文件注入）。
 * 代价：被代理站的 JS 会跑在我们的源里，所以默认给 iframe 加 sandbox，并且只代理 http(s)。
 */

const TIMEOUT = 20000
const MAX_BYTES = 24 * 1024 * 1024
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** 本地地址一律不代理，避免被当成内网探测工具 */
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|.*\.local|.*\.internal)$/i

const DROP_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'content-encoding',
  'content-length',
  'x-frame-options',
  'frame-options',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'strict-transport-security',
  'report-to',
  'reporting-endpoints',
  'clear-site-data',
  'alt-svc',
  'public-key-pins',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
])

/** `/p/https/foo.com/a/b.html?x=1` 里的 `/p/https/foo.com` 部分 */
function prefixOf(scheme, host) {
  return `/p/${scheme}/${host}`
}

/** 远程地址 → 代理路径 */
export function toProxyPath(target) {
  try {
    const url = new URL(target)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return `${prefixOf(url.protocol.slice(0, -1), url.host)}${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

/** 代理路径 → 远程地址；不是代理路径就返回 null */
export function toRemoteUrl(href, base = 'http://local') {
  try {
    const url = new URL(href, base)
    const hit = url.pathname.match(/^\/p\/(https?)\/([^/]+)(\/.*)?$/)
    if (!hit) return null
    return `${hit[1]}://${hit[2]}${hit[3] || '/'}${url.search}${url.hash}`
  } catch {
    return null
  }
}

function parse(pathname) {
  const hit = pathname.match(/^\/p\/(https?)\/([^/]+)(\/[^]*)?$/)
  if (!hit) return null
  const [, scheme, host, rest] = hit
  if (!host || PRIVATE_HOST.test(host)) return null
  return { scheme, host, rest: rest || '/', prefix: prefixOf(scheme, host) }
}

function failPage(res, status, message, target) {
  const html = `<!doctype html><html data-arg-proxy="fail"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>代理抓取失败</title>
<style>
body{margin:0;display:grid;place-items:center;min-height:100vh;background:#faf7f2;color:#3b3226;
font:14px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:28px;text-align:center}
b{display:block;margin-bottom:8px;font-size:16px}
code{display:block;margin-top:10px;font-size:11px;color:#8a7f6e;word-break:break-all}
</style></head><body><div>
<b>这个页面没能代理过来</b>
${message}
<code>${target ? escapeHtml(target) : ''}</code>
</div></body></html>`
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(html)
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  })
}

/**
 * 注入到被代理页里的桥接脚本。
 *
 * 原则：**任何外跳都收回房间里**。
 * - 站内链接（同一站点）在当前框里翻页；
 * - `target="_blank"`、`window.open`、中键、ctrl/⌘ 点击 → 交给我们自己的标签栏开新标签；
 * - 站外 http(s) 链接同样走代理，在我们自己的标签里打开，不甩到系统浏览器；
 * - 只有 mailto:/tel: 这类非网页链接才拦下并告知。
 */
function bridgeScript({ prefix, host }) {
  const cfg = JSON.stringify({ prefix, host })
  return `<script>(function(){
if(window.parent===window)return;
var CFG=${cfg};
var PC=window.parent;
function say(m){try{m.__arg=1;PC.postMessage(m,'*')}catch(e){}}
function abs(u){try{return new URL(String(u),location.href)}catch(e){return null}}
function open(u,blank){
  var x=abs(u);
  if(!x){say({t:'blocked',url:String(u).slice(0,80)});return true}
  if(x.protocol!=='http:'&&x.protocol!=='https:'){
    say({t:'blocked',url:x.href});
    return true;
  }
  say({t:'navigate',url:x.href,blank:!!blank});
  return true;
}
function usable(href){
  return href&&href.charAt(0)!=='#'&&!/^(javascript|mailto|tel|sms):/i.test(href);
}
document.addEventListener('click',function(e){
  if(e.defaultPrevented||e.button!==0)return;
  var t=e.target;
  if(!t||!t.closest)return;
  if(t.closest('[download]'))return;
  var a=t.closest('a[href],area[href]');
  if(!a)return;
  var href=a.getAttribute('href')||'';
  if(!usable(href))return;
  // 目标就是新窗口，或者用户按住 ctrl/⌘/shift：开成我们自己的标签页
  var blank=(a.target&&a.target!=='_self')||e.metaKey||e.ctrlKey||e.shiftKey;
  if(open(href,blank)){e.preventDefault();e.stopPropagation()}
},true);
// 中键：浏览器默认会自己开新窗口，同样收回我们的标签栏
document.addEventListener('auxclick',function(e){
  if(e.button!==1)return;
  var t=e.target;
  if(!t||!t.closest)return;
  var a=t.closest('a[href]');
  if(!a)return;
  var href=a.getAttribute('href')||'';
  if(!usable(href))return;
  if(open(href,true)){e.preventDefault();e.stopPropagation()}
},true);
// <base target="_blank"> 会让整站的链接都开新窗口，去掉这个默认值
function fixBase(){
  var bs=document.getElementsByTagName('base');
  for(var i=0;i<bs.length;i++){if(bs[i].target)bs[i].removeAttribute('target')}
}
document.addEventListener('submit',function(e){
  var f=e.target;
  if(f&&f.tagName==='FORM'&&f.target&&f.target!=='_self')f.target='_self';
},true);
window.open=function(u){
  var x=u?abs(u):null;
  if(x)say({t:'navigate',url:x.href,blank:true});
  var stub={closed:false,focus:function(){},blur:function(){},close:function(){},postMessage:function(){},
    document:{write:function(){},writeln:function(){},close:function(){}},opener:null};
  stub.location={
    assign:function(v){var y=abs(v);if(y)say({t:'navigate',url:y.href,blank:true})},
    replace:function(v){stub.location.assign(v)}
  };
  try{Object.defineProperty(stub.location,'href',{set:function(v){stub.location.assign(v)}})}catch(e){}
  return stub;
};
var last='';
function report(){
  fixBase();
  if(location.href===last)return;
  last=location.href;
  say({t:'url',url:location.href,title:document.title});
}
try{report()}catch(e){}
window.addEventListener('load',report);
window.addEventListener('popstate',report);
window.addEventListener('hashchange',report);
setInterval(report,2500);
})();</script>`
}

function rewriteCss(css, prefix) {
  return css
    .replace(/url\(\s*(['"]?)\//g, (m, q) => `url(${q}${prefix}/`)
    .replace(/@import\s+(['"])\//g, (m, q) => `@import ${q}${prefix}/`)
}

function rewriteHtml(html, prefix, host) {
  let out = html
    // 站点自带 CSP 会掐掉我们注入的脚本
    .replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '')
    // 根路径改成代理前缀，站内相对路径本来就是对的（路径结构镜像原站）
    .replace(
      /(\s(?:href|src|action|poster|formaction|data-src|data-href)\s*=\s*["'])\/(?!\/)/gi,
      (m, head) => `${head}${prefix}/`,
    )
    .replace(/url\(\s*(['"]?)\//g, (m, q) => `url(${q}${prefix}/`)

  const script = bridgeScript({ prefix, host })
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${script}`)
  else if (/<body[^>]*>/i.test(out)) out = out.replace(/<body[^>]*>/i, (m) => `${script}${m}`)
  else out = `${script}${out}`
  return out
}

/** 读请求体，超过 8MB 返回 null */
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    let size = 0
    let done = false
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 8 * 1024 * 1024) {
        if (!done) {
          done = true
          resolve(null)
        }
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!done) {
        done = true
        resolve(Buffer.concat(chunks))
      }
    })
    req.on('error', () => {
      if (!done) {
        done = true
        resolve(Buffer.alloc(0))
      }
    })
  })
}

function remoteFromReferer(referer) {
  if (!referer) return null
  try {
    return toRemoteUrl(referer, 'http://local')
  } catch {
    return null
  }
}

export async function handleProxy(req, res, url) {
  const info = parse(url.pathname)
  if (!info) {
    failPage(res, 400, '这个代理地址不合法，只支持 http / https 站点。')
    return true
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    res.writeHead(405, { allow: 'GET, HEAD, POST' })
    res.end()
    return true
  }

  const target = `${info.scheme}://${info.host}${info.rest}${url.search}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  const headers = {
    'user-agent': UA,
    accept: req.headers.accept || '*/*',
    'accept-language': req.headers['accept-language'] || 'zh-CN,zh;q=0.9,en;q=0.6',
  }
  const ref = remoteFromReferer(req.headers.referer)
  if (ref) headers.referer = ref
  if (req.headers.cookie) headers.cookie = req.headers.cookie
  if (req.headers.range) headers.range = req.headers.range

  const init = { headers, redirect: 'manual', signal: controller.signal, cache: 'no-store' }

  // 页面里的搜索 / 登录表单是 POST，直接转发，别让它们 405
  if (req.method === 'POST') {
    const body = await readBody(req)
    if (body === null) {
      clearTimeout(timer)
      failPage(res, 413, '提交的内容太大了。', target)
      return true
    }
    init.method = 'POST'
    init.body = body
    headers['content-type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded'
  }

  let upstream
  try {
    upstream = await fetch(target, init)
  } catch (err) {
    clearTimeout(timer)
    const reason = err?.name === 'AbortError' ? '抓取超时（20 秒没有回应）' : '目标站点连不上'
    failPage(res, 502, `${reason}，可以点上方地址栏换成原站直连试试。`, target)
    return true
  }
  clearTimeout(timer)

  // 重定向：把 Location 折回代理路径
  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get('location')
    const next = location ? toProxyPath(new URL(location, target).href) : null
    if (next) {
      res.writeHead(upstream.status, { location: next, 'cache-control': 'no-store' })
    } else {
      res.writeHead(upstream.status, { location: location || '/', 'cache-control': 'no-store' })
    }
    res.end()
    return true
  }

  const type = (upstream.headers.get('content-type') || '').toLowerCase()
  const isHtml = type.includes('text/html') || type.includes('application/xhtml')
  const isCss = type.includes('text/css')

  const outHeaders = {}
  for (const [key, value] of upstream.headers.entries()) {
    if (DROP_HEADERS.has(key)) continue
    if (key === 'set-cookie') continue
    outHeaders[key] = value
  }
  const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : []
  if (cookies.length) {
    outHeaders['set-cookie'] = cookies.map((line) => line.replace(/;\s*domain=[^;]+/gi, '').replace(/;\s*secure/gi, ''))
  }

  if (!isHtml && !isCss) {
    // 静态资源原样转发（图片 / JS / 字体）
    res.writeHead(upstream.status, outHeaders)
    if (upstream.body && req.method !== 'HEAD') {
      const { Readable } = await import('node:stream')
      Readable.fromWeb(upstream.body).pipe(res)
    } else {
      res.end()
    }
    return true
  }

  let text = await upstream.text()
  text = isHtml ? rewriteHtml(text, info.prefix, info.host) : rewriteCss(text, info.prefix)

  const body = Buffer.from(text, 'utf8')
  if (body.byteLength > MAX_BYTES) {
    failPage(res, 502, '这个页面太大了，没有代理过来。', target)
    return true
  }

  outHeaders['content-type'] = isHtml ? 'text/html; charset=utf-8' : 'text/css; charset=utf-8'
  outHeaders['content-length'] = String(body.byteLength)
  outHeaders['cache-control'] = 'no-store'
  res.writeHead(upstream.status, outHeaders)
  res.end(req.method === 'HEAD' ? undefined : body)
  return true
}

/** 代理页里 JS 拼出来的根路径（`/data/x.json`）会落到我们域名上：按 Referer 折回代理 */
export function proxyPathFromReferer(referer) {
  const remote = remoteFromReferer(referer)
  if (!remote) return null
  try {
    const base = new URL(remote)
    return base
  } catch {
    return null
  }
}
