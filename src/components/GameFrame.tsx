import { ArrowLeft } from 'lucide-react'
import { t } from '../lib/copy'

interface Props {
  src: string
  phone: boolean
  backVisible?: boolean
  onBack?: () => void
}

/**
 * 桌面与平板上，游戏占满面板左边剩下的整块区域，不再把 430 宽的手机画面放大一点点。
 * 面板那 360 一直预留，所以开合面板时游戏不会跳动。
 */
export function GameFrame({ src, phone, backVisible = false, onBack }: Props) {
  return (
    <div className={phone ? 'stage stage--phone' : 'stage'}>
      <div className="frame">
        <iframe src={src} title="游戏" allow="clipboard-write" />
        {backVisible && (
          <button type="button" className="back-pill" onClick={onBack}>
            <ArrowLeft size={13} strokeWidth={1.8} />
            {t('room.back')}
          </button>
        )}
      </div>
    </div>
  )
}
