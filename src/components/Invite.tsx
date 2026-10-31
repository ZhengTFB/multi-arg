import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Share2, X } from 'lucide-react'
import type { Room } from '../lib/types'
import { Button } from './ui/Button'

interface Props {
  room: Room
  token: string
  open: boolean
  onClose: () => void
}

export function Invite({ room, token, open, onClose }: Props) {
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)
  const url = `${location.origin}/r/${room.id}#${token}`

  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#5C4033', light: '#FFFFFF' } })
      .then((out) => {
        if (alive) setSvg(out)
      })
      .catch(() => {
        if (alive) setSvg('')
      })
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* 非安全上下文下剪贴板不可用，用户还能手动选房间号 */
    }
  }

  return (
    <div className="invite" data-open={open} aria-hidden={!open}>
      <button type="button" className="icon-btn invite-close" aria-label="关闭" onClick={onClose}>
        <X size={14} strokeWidth={1.5} />
      </button>

      <p className="eyebrow">邀请</p>
      <p className="invite-room">{room.id}</p>
      <p className="invite-pass">
        口令 <b>{room.pass}</b>
      </p>

      <div className="qr" aria-label="进房二维码">
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--linen)', borderRadius: 8 }} />
        )}
      </div>

      <div className="invite-actions">
        <Button variant="secondary" block onClick={copy}>
          {copied ? '已复制' : '复制链接'}
        </Button>
        {canShare && (
          <Button
            variant="ghost"
            block
            onClick={() => {
              navigator.share({ url }).catch(() => {})
            }}
          >
            <Share2 size={14} strokeWidth={1.5} />
            隔空投送
          </Button>
        )}
      </div>
    </div>
  )
}
