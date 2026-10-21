// 气泡提示：所有图标按钮统一用它显示名称与快捷键（Radix Tooltip，Provider 挂在 App）。
import type { ReactNode } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

interface Props {
  label: string
  kbd?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}

export function Tip({ label, kbd, side = 'bottom', children }: Props) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="ds-tip" side={side} sideOffset={8} collisionPadding={8}>
          {label}
          {kbd && <span className="ds-tip-kbd">{kbd}</span>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
