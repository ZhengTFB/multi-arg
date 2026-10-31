import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** 输入框高度档位：默认 52px，hero 72px。 */
  tall?: boolean
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { tall = false, className = '', ...rest },
  ref,
) {
  const cls = ['input', tall ? 'paste-input' : '', className].filter(Boolean).join(' ')
  return <input ref={ref} className={cls} {...rest} />
})
