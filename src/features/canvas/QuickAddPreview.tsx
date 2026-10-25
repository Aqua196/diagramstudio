// 快捷加号的落点预览：在新节点将出现的位置画出它的半透明虚影，再用一段虚线连回当前节点。
// 画在当前节点内部、用节点局部坐标（随画布缩放）；不可交互、不进读屏、不进导出。
import type { CSSProperties } from 'react'
import type { DiagramNode } from '@/core/model/types'
import type { NodeSide } from '@/core/plugin'
import type { ReactPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'

const OPPOSITE: Record<NodeSide, NodeSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

/** 节点某条边的中点（相对当前节点左上角） */
function sideMid(n: DiagramNode, side: NodeSide, ox: number, oy: number) {
  const { w, h } = n.size
  if (side === 'top') return { x: ox + w / 2, y: oy }
  if (side === 'bottom') return { x: ox + w / 2, y: oy + h }
  if (side === 'left') return { x: ox, y: oy + h / 2 }
  return { x: ox + w, y: oy + h / 2 }
}

const noop = () => undefined

export function QuickAddPreview({
  plan,
  side,
  plugin,
}: {
  plan: { from: DiagramNode; node: DiagramNode }
  side: NodeSide
  plugin: ReactPlugin
}) {
  const doc = useDocumentStore((s) => s.doc)
  const { from, node } = plan
  const dx = node.position.x - from.position.x
  const dy = node.position.y - from.position.y
  const a = sideMid(from, side, 0, 0)
  const b = sideMid(node, OPPOSITE[side], dx, dy)
  const shape = plugin.shapes.find((s) => s.kind === node.kind)
  const ghost: DiagramNode = { ...node, text: '' }
  const box: CSSProperties = { left: dx, top: dy, width: node.size.w, height: node.size.h }
  return (
    <>
      <svg className="ds-quick-link ds-export-exclude" width={1} height={1} aria-hidden>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      </svg>
      {/* inert 让虚影里的按钮/输入框（如 ER 字段行）完全不可达；React 18 需以字符串属性传入 */}
      <div className="ds-quick-ghost ds-export-exclude" style={box} aria-hidden {...{ inert: '' }}>
        {shape?.render(ghost, { editing: false, dispatch: noop, doc })}
      </div>
    </>
  )
}
