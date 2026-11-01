import type { ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { t } from '../lib/copy'

interface Props {
  src: string
  phone: boolean
  reloadKey: number
  stuck: boolean
  chrome?: ReactNode
  onLoad: () => void
  onReload: () => void
}

/**
 * 游戏区。桌面与平板占满面板左边，手机全屏；
 * 顶上是浏览器条（地址、标签页），沉浸模式下整条隐藏。
 */
export function GameFrame({ src, phone, reloadKey, stuck, chrome, onLoad, onReload }: Props) {
  return (
    <div className={phone ? 'stage stage--phone' : 'stage'}>
      <div className="frame">
        {chrome}
        <div className="frame-body">
          <iframe
            key={`${src}#${reloadKey}`}
            src={src}
            title="游戏"
            allow="clipboard-write; fullscreen"
            // 不给 allow-popups / allow-top-navigation：游戏里的 target=_blank 不会把用户甩到系统浏览器
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
            onLoad={onLoad}
          />
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
