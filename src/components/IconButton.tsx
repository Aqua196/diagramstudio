// 图标按钮：aria-label 即提示文字；带快捷键时气泡里一并显示。
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Tip } from './Tip'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  kbd?: string
  active?: boolean
  small?: boolean
  danger?: boolean
  tipSide?: 'top' | 'right' | 'bottom' | 'left'
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, kbd, active, small, danger, tipSide, className = '', ...rest },
  ref,
) {
  const cls = [
    'ds-icon-btn',
    small ? 'ds-icon-btn-sm' : '',
    active ? 'is-active' : '',
    danger ? 'is-danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Tip label={label} kbd={kbd} side={tipSide}>
      <button ref={ref} type="button" className={cls} aria-label={label} {...rest}>
        {icon}
      </button>
    </Tip>
  )
})
