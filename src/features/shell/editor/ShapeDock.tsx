// 左侧形状坞：工具（选择/抓手）· 常用形状（点击放到视口中心，也可拖入）· 更多形状 · 示例 · 自动整理。
// 形状与动作全部来自当前插件，坞本身不区分图类型。
import * as Popover from '@radix-ui/react-popover'
import { Hand, LayoutTemplate, MousePointer2, Shapes, WandSparkles } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { ShapeDef } from '@/core/plugin'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { setShapeDragData } from '@/features/canvas/dnd'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { Tip } from '@/components/Tip'

const e = zh.editor
const PRIMARY = 5

function ShapeButton({ s }: { s: ShapeDef<React.ReactNode> }) {
  return (
    <Tip label={s.name} kbd={e.shapeHint} side="right">
      <button
        type="button"
        className="ds-icon-btn ds-dock-shape"
        draggable
        aria-label={s.name}
        onDragStart={(ev) => setShapeDragData(ev.dataTransfer, s.kind)}
        onClick={() => emit(EV.ADD_SHAPE, { kind: s.kind })}
      >
        {s.icon}
      </button>
    </Tip>
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
      <Tip label={label} side="right">
        <Popover.Trigger asChild>
          <button type="button" className="ds-icon-btn" aria-label={label}>
            {icon}
          </button>
        </Popover.Trigger>
      </Tip>
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
    <nav className="ds-float ds-float-col ds-dock" aria-label={e.shapes}>
      <IconButton
        icon={<MousePointer2 size={18} />}
        label={e.toolSelect}
        kbd="V"
        tipSide="right"
        active={tool === 'select'}
        onClick={() => setTool('select')}
      />
      <IconButton
        icon={<Hand size={18} />}
        label={e.toolHand}
        kbd="H"
        tipSide="right"
        active={tool === 'hand'}
        onClick={() => setTool('hand')}
      />
      <span className="ds-sep" />
      {shapes.slice(0, PRIMARY).map((s) => (
        <ShapeButton key={s.kind} s={s} />
      ))}
      {shapes.length > PRIMARY && <MoreShapes shapes={shapes.slice(PRIMARY)} />}
      <span className="ds-sep" />
      <Templates />
      {!plugin.autoLayoutOnChange && (
        <IconButton
          icon={<WandSparkles size={18} />}
          label={e.autoLayout}
          kbd="Shift+L"
          tipSide="right"
          onClick={() => emit(EV.AUTO_LAYOUT, direction)}
        />
      )}
    </nav>
  )
}
