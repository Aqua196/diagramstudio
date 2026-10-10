// 四向连接锚点：连接模式为 Loose（每个点既可做起点也可做终点），
// 记录到 DiagramEdge.sourceHandle/targetHandle 的是方向 id。
import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

const SIDES = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
] as const

/** 悬停节点时出现的 8px 连接点（样式见 canvas.css） */
function ShapeHandlesInner() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle key={s.id} id={s.id} type="source" position={s.position} className="ds-handle" />
      ))}
    </>
  )
}

export const ShapeHandles = memo(ShapeHandlesInner)
