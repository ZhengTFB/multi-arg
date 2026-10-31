import { useState } from 'react'
import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import type { Item } from '../../lib/types'

interface Props {
  items: Item[]
  onToggleVerify: (item: Item) => void
}

export function Secrets({ items, onToggleVerify }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const list = items.filter((i) => i.type === 'secret' && i.secret).sort((a, b) => b.createdAt - a.createdAt)

  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (list.length === 0) {
    return (
      <div className="module">
        <p className="feed-empty">
          还没有记过。试试 <span className="mono">密 账号 / 密码 / 用途</span>。
        </p>
      </div>
    )
  }

  return (
    <div className="module">
      {list.map((item) => {
        const secret = item.secret!
        const open = revealed.has(item.id)
        return (
          <div key={item.id} className="secret-card">
            <div className="secret-top">
              <span className="secret-account">{secret.account}</span>
              {secret.verified && <span className="tag tag--hit">已验证</span>}
            </div>

            <div className="secret-pass">
              <span>{open ? secret.password : '••••••'}</span>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 22, height: 22 }}
                aria-label={open ? '遮住密码' : '显示密码'}
                onClick={() => toggle(item.id)}
              >
                {open ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
              </button>
            </div>

            {secret.usage && <p className="secret-usage">{secret.usage}</p>}

            <div className="secret-foot">
              <button
                type="button"
                className="verify"
                data-on={secret.verified}
                onClick={() => onToggleVerify(item)}
              >
                {secret.verified ? (
                  <Check size={12} strokeWidth={2} />
                ) : (
                  <Circle size={11} strokeWidth={1.5} />
                )}
                {secret.verified ? '已验证' : '还没试过'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
