import { useRef } from 'react'
import type { ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { t } from '../lib/copy'

export interface FrameAlert {
  title: string
  hint?: string
  actions: { label: string; onClick: () => void }[]
}

interface Props {
  src: string
  phone: boolean
  reloadKey: number
  stuck: boolean
  chrome?: ReactNode
  alert?: FrameAlert | null
  onLoad: () => void
  onReload: () => void
  /** 代理抓不到目标站时回调，让房间退回直连 */
  onProxyFail?: () => void
}

/**
 * 游戏区。桌面与平板占满面板左边，手机全屏；
 * 顶上是浏览器条（地址、标签页），沉浸模式下整条隐藏。
 *
 * 页面统一走同源 `/p` 代理，所以这里能读 `contentDocument`：
 * 代理失败页带 `data-arg-proxy="fail"`，读到就退回直连。
 */
export function GameFrame({
  src,
  reloadKey,
  stuck,
  chrome,
  alert,
  onLoad,
  onReload,
  onProxyFail,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  const handleLoad = () => {
    try {
      const doc = frameRef.current?.contentDocument
      if (doc?.documentElement?.dataset?.argProxy === 'fail') {
        onProxyFail?.()
        return
      }
    } catch {
      /* 直连模式下跨域，读不到就不管 */
    }
    onLoad()
  }

  return (
    <div className="stage">
      <div className="frame">
        {chrome}
        <div className="frame-body">
          <iframe
            ref={frameRef}
            key={reloadKey}
            src={src}
            title="游戏"
            allow="clipboard-write; fullscreen"
            // 不给 allow-popups / allow-top-navigation：游戏里的 target=_blank 不会把用户甩到系统浏览器
            // 站内翻页由页面里的桥接脚本改成当前框内跳转，站外链接则会回传给我们弹提示
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
            onLoad={handleLoad}
          />
          {alert && (
            <div className="frame-alert" role="alert">
              <p className="frame-alert-title">{alert.title}</p>
              {alert.hint && <p className="frame-alert-hint">{alert.hint}</p>}
              <div className="frame-alert-actions">
                {alert.actions.map((action) => (
                  <button key={action.label} type="button" className="frame-alert-btn" onClick={action.onClick}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {stuck && (
            <button type="button" className="frame-reload" onClick={onReload}>
              <RotateCw size={14} strokeWidth={1.8} />
              <span data-copy="room.frame.reload">{t('room.frame.reload')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
