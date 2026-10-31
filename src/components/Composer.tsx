import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function Composer({ onSend, disabled = false, autoFocus = false }: Props) {
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
    <div className="composer">
      <p className="composer-hint">词 xxx = 命中 · 密 账号 / 密码 / 用途</p>
      <div className="composer-box">
        <textarea
          ref={ref}
          data-composer
          rows={1}
          autoFocus={autoFocus}
          value={text}
          placeholder="说点什么…"
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value)
            resize()
          }}
          onFocus={() => {
            const el = ref.current
            if (el && !text) el.style.height = '44px'
          }}
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
          aria-label="发出去"
          disabled={disabled || !text.trim()}
          onClick={submit}
        >
          <ArrowUp size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
