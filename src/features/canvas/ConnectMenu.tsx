// 连线拖到空白处松手时弹出的形状菜单（SPEC §5）：
// 选中形状后在落点建节点并自动连好 —— 一条命令。
import { useEffect, useRef } from 'react'
import { createEdge, createNode } from '@/core/model/factories'
import { insertElements } from '@/core/commands/ops'
import type { DiagramPlugin } from '@/core/plugin'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import type { ConnectMenuState } from './canvasStore'

interface Props {
  menu: ConnectMenuState
  plugin: DiagramPlugin<React.ReactNode>
  onClose: () => void
}

export function ConnectMenu({ menu, plugin, onClose }: Props) {
  const shapes = plugin.shapes
  const execute = useDocumentStore((s) => s.execute)
  const setSelection = useUiStore((s) => s.setSelection)
  const ref = useRef<HTMLDivElement>(null)

  // 点击菜单外任意处或 Esc 关闭
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
  }, [onClose])

  const pick = (kind: string) => {
    const shape = shapes.find((s) => s.kind === kind)
    if (!shape) return
    const { w, h } = shape.defaultSize
    const node = createNode(kind, { x: menu.flowX - w / 2, y: menu.flowY - h / 2 }, { w, h })
    const { source, target, sourceHandle, targetHandle } = menu.fromIsSource
      ? {
          source: menu.fromNodeId,
          target: node.id,
          sourceHandle: menu.fromHandleId,
          targetHandle: undefined,
        }
      : {
          source: node.id,
          target: menu.fromNodeId,
          sourceHandle: undefined,
          targetHandle: menu.fromHandleId,
        }
    const edge = createEdge(source, target, {
      sourceHandle: sourceHandle ?? undefined,
      targetHandle: targetHandle ?? undefined,
      routing: plugin.edgeDefaults.routing,
      arrowStart: plugin.edgeDefaults.arrowStart,
      arrowEnd: plugin.edgeDefaults.arrowEnd,
      style: { ...plugin.edgeDefaults.style },
    })
    execute(insertElements([node], [edge], '添加节点并连接'))
    setSelection({ nodeIds: [node.id], edgeIds: [] })
    onClose()
  }

  return (
    <div
      ref={ref}
      className="ds-connect-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      aria-label={zh.canvas.connectMenuTitle}
    >
      <div className="ds-menu-title">{zh.canvas.connectMenuTitle}</div>
      {shapes.map((s) => (
        <button
          key={s.kind}
          type="button"
          role="menuitem"
          className="ds-menu-item"
          onClick={() => pick(s.kind)}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
