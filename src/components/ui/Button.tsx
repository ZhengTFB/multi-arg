import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'sage' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'lg'
  block?: boolean
}

export function Button({ variant = 'secondary', size = 'sm', block = false, className = '', ...rest }: Props) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={cls} {...rest} />
}
