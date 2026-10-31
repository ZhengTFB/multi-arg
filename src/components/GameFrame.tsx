import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { FRAME_H, FRAME_W, computeScale } from '../lib/fit'
import { t } from '../lib/copy'

interface Props {
  src: string
  phone: boolean
  backVisible?: boolean
  onBack?: () => void
}

export function GameFrame({ src, phone, backVisible = false, onBack }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (phone) return
    const el = stageRef.current
    if (!el) return

    const measure = () => {
      const cs = getComputedStyle(el)
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      setScale(computeScale(el.clientWidth - padX, el.clientHeight - padY))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [phone])

  return (
    <div className="stage" ref={stageRef}>
      <div
        className="frame-shell"
        style={phone ? undefined : { width: FRAME_W * scale, height: FRAME_H * scale }}
      >
        <div className="frame" style={phone ? undefined : { transform: `scale(${scale})` }}>
          <iframe src={src} title="游戏" allow="clipboard-write" />
          {backVisible && (
            <button type="button" className="back-pill" onClick={onBack}>
              <ArrowLeft size={13} strokeWidth={1.8} />
              {t('room.back')}
            </button>
          )}
        </div>
      </div>
      {!phone && scale < 0.72 && <div className="stage-hint">横过来看会大一些</div>}
    </div>
  )
}
