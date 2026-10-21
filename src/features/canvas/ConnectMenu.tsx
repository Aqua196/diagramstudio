// 连线拖到空白处松手时弹出的形状菜单（SPEC §5）：
// 选中形状后在落点建节点并自动连好 —— 一条命令，随后直接编辑新节点文字。
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { insertElements } from '@/core/commands/ops'
import type { DiagramPlugin } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import type { ConnectMenuState } from './canvasStore'
import { executeAndFocus } from './focus'
import { createPluginEdge, createShapeNode } from './nodeFactory'

interface Props {
  menu: ConnectMenuState
  plugin: DiagramPlugin<React.ReactNode>
  onClose: () => void
}

/** 在落点建节点并连好的复合命令数据（纯函数，便于测试与复用） */
function buildNodeAndEdge(
  menu: ConnectMenuState,
  kind: string,
  plugin: DiagramPlugin<React.ReactNode>,
) {
  const node = createShapeNode(plugin, kind, { x: menu.flowX, y: menu.flowY })
  if (!node) return null
  const ends = menu.fromIsSource
    ? { source: menu.fromNodeId, target: node.id, sourceHandle: menu.fromHandleId ?? undefined }
    : { source: node.id, target: menu.fromNodeId, targetHandle: menu.fromHandleId ?? undefined }
  const edge = createPluginEdge(plugin, ends.source, ends.target, ends)
  return { node, edge }
}

/** 点击菜单外任意处或 Esc 关闭 */
function useDismiss(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void): void {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [ref, onClose])
}

/** 菜单贴着落点出现，但不超出画布容器（靠近边缘时向内收） */
function useClampedPos(ref: React.RefObject<HTMLDivElement | null>, x: number, y: number) {
  const [pos, setPos] = useState({ left: x, top: y })
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement?.getBoundingClientRect()
    if (!el || !box) return
    const M = 12
    setPos({
      left: Math.max(M, Math.min(x, box.width - el.offsetWidth - M)),
      top: Math.max(M, Math.min(y, box.height - el.offsetHeight - M)),
    })
  }, [ref, x, y])
  return pos
}

export function ConnectMenu({ menu, plugin, onClose }: Props) {
  const shapes = plugin.shapes.filter((s) => !s.paletteHidden)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose)
  const pos = useClampedPos(ref, menu.x, menu.y)

  const pick = (kind: string) => {
    const built = buildNodeAndEdge(menu, kind, plugin)
    if (!built) return
    onClose()
    executeAndFocus(insertElements([built.node], [built.edge], '添加节点并连接'))
  }

  return (
    <div
      ref={ref}
      className="ds-connect-menu"
      style={pos}
      role="menu"
      aria-label={zh.canvas.connectMenuTitle}
    >
      <div className="ds-menu-label">{zh.canvas.connectMenuTitle}</div>
      <div className="ds-connect-grid">
        {shapes.map((s) => (
          <button
            key={s.kind}
            type="button"
            role="menuitem"
            className="ds-connect-item"
            onClick={() => pick(s.kind)}
          >
            {s.icon}
            <span>{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
