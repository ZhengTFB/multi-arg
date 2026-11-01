import { Check, Circle } from 'lucide-react'
import type { Item } from '../../lib/types'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
  onToggleVerify: (item: Item) => void
}

export function Secrets({ items, onToggleVerify }: Props) {
  const list = items
    .filter((i) => i.type === 'secret' && i.secret)
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="module">
      <div className="module-head">
        <span>{list.length} 条密码</span>
      </div>

      {list.length === 0 ? (
        <p className="feed-empty">{t('secret.empty')}</p>
      ) : (
        list.map((item) => {
          const secret = item.secret!
          return (
            <div key={item.id} className="secret-card">
              <div className="secret-top">
                <span className="secret-account">{secret.account}</span>
                {secret.verified && <span className="tag tag--hit">{t('secret.verified')}</span>}
              </div>

              <div className="secret-pass">{secret.password}</div>

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
