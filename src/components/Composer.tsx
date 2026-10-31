import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { t } from '../lib/copy'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  /** 切到模块视图时只隐藏，不卸载，草稿不会丢。 */
  hidden?: boolean
}

export function Composer({ onSend, disabled = false, hidden = false }: Props) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 104)}px`
  }

  const submit = () => {
    const value = text.trim()
    if (!value || disabled) return
    onSend(value)
    setText('')
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.focus()
    }
  }

  return (
    <div className="composer" data-hidden={hidden}>
      <div className="composer-box">
        <textarea
          ref={ref}
          data-composer
          rows={1}
          value={text}
          placeholder={t('room.composer.placeholder')}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value)
            resize()
          }}
          onFocus={resize}
          onBlur={resize}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button
          type="button"
          className="send-btn"
          aria-label={t('room.composer.send')}
          disabled={disabled || !text.trim()}
          onClick={submit}
        >
          <ArrowUp size={16} strokeWidth={2} />
        </button>
      </div>
      <p className="composer-hint" data-copy="room.composer.hint">
        {t('room.composer.hint')}
      </p>
    </div>
  )
}
