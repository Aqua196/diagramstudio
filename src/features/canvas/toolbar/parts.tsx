// 工具条共用件：弹层按钮、配色板、字号选择。颜色样本取 palette（与画布同源）。
import type { ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check } from 'lucide-react'
import { NODE_COLORS, NODE_STROKES, type NodeColorKey } from '@/core/palette'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { Tip } from '@/components/Tip'

const t = zh.toolbar

/** 图标按钮 + 弹层：按钮本身带气泡提示 */
export function PopButton({
  label,
  icon,
  children,
  active,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
  active?: boolean
}) {
  return (
    <Popover.Root>
      <Tip label={label} side="top">
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`ds-icon-btn${active ? ' is-active' : ''}`}
            aria-label={label}
          >
            {icon}
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="ds-pop" side="top" sideOffset={10} collisionPadding={12}>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** 当前颜色的小圆点（工具条按钮图标） */
export function ColorDot({ fill }: { fill: string }) {
  const theme = useUiStore((s) => s.resolvedTheme)
  const k = (fill in NODE_COLORS ? fill : 'white') as NodeColorKey
  return (
    <span
      className="ds-color-dot"
      style={{ background: NODE_COLORS[k][theme], borderColor: NODE_STROKES[k][theme] }}
    />
  )
}

export function ColorGrid({
  value,
  onPick,
}: {
  value?: string
  onPick: (k: NodeColorKey) => void
}) {
  const theme = useUiStore((s) => s.resolvedTheme)
  return (
    <>
      <p className="ds-pop-title">{t.color}</p>
      <div className="ds-swatches" role="group" aria-label={t.color}>
        {(Object.keys(NODE_COLORS) as NodeColorKey[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`ds-swatch${value === k ? ' is-active' : ''}`}
            style={{ background: NODE_COLORS[k][theme], borderColor: NODE_STROKES[k][theme] }}
            title={NODE_COLORS[k].name}
            aria-label={NODE_COLORS[k].name}
            aria-pressed={value === k}
            onClick={() => onPick(k)}
          >
            {value === k && <Check size={14} strokeWidth={2.5} color={NODE_STROKES[k][theme]} />}
          </button>
        ))}
      </div>
    </>
  )
}

export const FONT_SIZES: Array<[number, string]> = [
  [12, t.sizeS],
  [14, t.sizeM],
  [18, t.sizeL],
]

export function FontSizeSeg({ value, onPick }: { value?: number; onPick: (n: number) => void }) {
  return (
    <>
      <p className="ds-pop-title">{t.fontSize}</p>
      <div className="ds-seg">
        {FONT_SIZES.map(([n, label]) => (
          <button
            key={n}
            type="button"
            className={`ds-seg-btn${value === n ? ' is-active' : ''}`}
            onClick={() => onPick(n)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  )
}
