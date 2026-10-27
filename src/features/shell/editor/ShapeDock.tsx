// 左侧形状坞：工具（选择/抓手）· 常用形状（点击放到视口中心，也可拖入）· 更多形状 · 示例 · 自动整理。
// 形状与动作全部来自当前插件，坞本身不区分图类型。
// 平时只露图标；鼠标停留（或键盘移入）时整条向右展开，每一项显示名称与快捷键，代替逐个的气泡提示。
import * as Popover from '@radix-ui/react-popover'
import { Hand, LayoutTemplate, MousePointer2, Shapes, WandSparkles } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { ShapeDef } from '@/core/plugin'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { setShapeDragData } from '@/components/shapeDrag'
import { zh } from '@/i18n/zh'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

const e = zh.editor
const PRIMARY = 5

interface ItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  kbd?: string
  active?: boolean
}

/** 坞里的一项：图标 + 展开时出现的名称与快捷键（名称即无障碍名，快捷键不读出） */
const DockItem = forwardRef<HTMLButtonElement, ItemProps>(function DockItem(
  { icon, label, kbd, active, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`ds-icon-btn ds-dock-item${active ? ' is-active' : ''} ${className}`}
      aria-label={label}
      aria-pressed={active}
      {...rest}
    >
      {icon}
      <span className="ds-dock-label">{label}</span>
      {kbd && (
        <span className="ds-dock-kbd" aria-hidden>
          {kbd}
        </span>
      )}
    </button>
  )
})

function ShapeButton({ s }: { s: ShapeDef<React.ReactNode> }) {
  return (
    <DockItem
      icon={s.icon}
      label={s.name}
      className="ds-dock-shape"
      draggable
      onDragStart={(ev) => setShapeDragData(ev.dataTransfer, s.kind)}
      onClick={() => emit(EV.ADD_SHAPE, { kind: s.kind })}
    />
  )
}

function DockPopover({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <DockItem icon={icon} label={label} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="ds-pop"
          side="right"
          align="start"
          sideOffset={12}
          collisionPadding={12}
        >
          <p className="ds-pop-title">{label}</p>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function MoreShapes({ shapes }: { shapes: ShapeDef<React.ReactNode>[] }) {
  return (
    <DockPopover label={e.moreShapes} icon={<Shapes size={18} />}>
      <div className="ds-shape-grid">
        {shapes.map((s) => (
          <Popover.Close asChild key={s.kind}>
            <button
              type="button"
              className="ds-shape-tile"
              draggable
              onDragStart={(ev) => setShapeDragData(ev.dataTransfer, s.kind)}
              onClick={() => emit(EV.ADD_SHAPE, { kind: s.kind })}
            >
              {s.icon}
              <span>{s.name}</span>
            </button>
          </Popover.Close>
        ))}
      </div>
    </DockPopover>
  )
}

function Templates() {
  const type = useDocumentStore((s) => s.doc.type)
  const templates = getPlugin(type).templates
  return (
    <DockPopover label={e.templates} icon={<LayoutTemplate size={18} />}>
      <div className="ds-tpl-list">
        {templates.map((t, i) => (
          <Popover.Close asChild key={t.id}>
            <button
              type="button"
              className="ds-tpl-item"
              onClick={() => emit(EV.NEW_DOC, { type, templateId: String(i) })}
            >
              <span className="ds-tpl-name">{t.title}</span>
              <span className="ds-tpl-meta">{zh.plugins.typeNames[type]}</span>
            </button>
          </Popover.Close>
        ))}
      </div>
    </DockPopover>
  )
}

export function ShapeDock() {
  const type = useDocumentStore((s) => s.doc.type)
  const direction = useDocumentStore((s) => s.doc.settings.layoutDirection)
  const tool = useUiStore((s) => s.tool)
  const setTool = useUiStore((s) => s.setTool)
  const plugin = getPlugin(type)
  const shapes = plugin.shapes.filter((s) => !s.paletteHidden)
  return (
    <div className="ds-dock">
      <nav className="ds-dock-panel" aria-label={e.shapes}>
        <DockItem
          icon={<MousePointer2 size={18} />}
          label={e.toolSelect}
          kbd="V"
          active={tool === 'select'}
          onClick={() => setTool('select')}
        />
        <DockItem
          icon={<Hand size={18} />}
          label={e.toolHand}
          kbd="H"
          active={tool === 'hand'}
          onClick={() => setTool('hand')}
        />
        <span className="ds-sep" />
        {shapes.slice(0, PRIMARY).map((s) => (
          <ShapeButton key={s.kind} s={s} />
        ))}
        {shapes.length > PRIMARY && <MoreShapes shapes={shapes.slice(PRIMARY)} />}
        {/* 收起时是一条分隔线，展开时换成操作提示：占位不变，展开时不会把整条坞撑高、上下跳 */}
        <span className="ds-dock-hint" aria-hidden>
          <span>{e.shapeHint}</span>
        </span>
        <Templates />
        {!plugin.autoLayoutOnChange && (
          <DockItem
            icon={<WandSparkles size={18} />}
            label={e.autoLayout}
            kbd="⇧L"
            onClick={() => emit(EV.AUTO_LAYOUT, direction)}
          />
        )}
      </nav>
    </div>
  )
}
