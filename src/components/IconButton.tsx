// 通用图标按钮：统一尺寸/焦点/hover，顶栏与面板共用。
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  active?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, active, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`ds-icon-btn${active ? ' is-active' : ''} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
})
