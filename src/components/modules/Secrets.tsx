import { useState } from 'react'
import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import type { Item } from '../../lib/types'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
  onAdd: (account: string, password: string, usage: string) => void
  onToggleVerify: (item: Item) => void
}

export function Secrets({ items, onAdd, onToggleVerify }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [usage, setUsage] = useState('')

  const list = items
    .filter((i) => i.type === 'secret' && i.secret)
    .sort((a, b) => b.createdAt - a.createdAt)

  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const commit = () => {
    if (!account.trim() || !password.trim()) return
    onAdd(account.trim(), password.trim(), usage.trim())
    setAccount('')
    setPassword('')
    setUsage('')
  }

  return (
    <div className="module">
      <div className="module-head">
        <span>{list.length} 条密码</span>
      </div>

      <div className="module-add module-add--stack">
        <input
          value={account}
          placeholder="账号 / 用途名"
          onChange={(e) => setAccount(e.target.value)}
        />
        <input value={password} placeholder="密码" onChange={(e) => setPassword(e.target.value)} />
        <div className="module-add-row">
          <input value={usage} placeholder="用在哪（可空）" onChange={(e) => setUsage(e.target.value)} />
          <button
            type="button"
            className="tag tag--hit"
            onClick={commit}
            disabled={!account.trim() || !password.trim()}
          >
            {t('modules.add')}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="feed-empty">{t('secret.empty')}</p>
      ) : (
        list.map((item) => {
          const secret = item.secret!
          const open = revealed.has(item.id)
          return (
            <div key={item.id} className="secret-card">
              <div className="secret-top">
                <span className="secret-account">{secret.account}</span>
                {secret.verified && <span className="tag tag--hit">{t('secret.verified')}</span>}
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
                  {secret.verified ? t('secret.verified') : t('secret.unverified')}
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
