// ER 实体节点渲染：表头 + 字段行；weak=true 时在同一 svg 内画内缩 4px 的第二层边框。
// 颜色一律用画布注入的 --node-* 变量；命令经 ctx.dispatch 提交。
// 字段行实现拆在 erFields.tsx（C1），re-export ROW_H/HEAD_H 保持旧导入兼容。
import type { ReactNode } from 'react'
import type { DiagramNode } from '@/core/model/types'
import type { ShapeRenderContext } from '@/core/plugin'
import { FieldRows, fieldsOf, HEAD_H, ROW_H } from './erFields'

export { ROW_H, HEAD_H }

export function entityRender(
  node: DiagramNode,
  ctx: ShapeRenderContext,
  opts?: { weak?: boolean },
): ReactNode {
  const { w } = node.size
  const fields = fieldsOf(node)
  const h = Math.max(node.size.h, HEAD_H + Math.max(1, fields.length) * ROW_H + 4)
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <rect width={w} height={h} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      {opts?.weak && (
        <rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      )}
      <rect width={w} height={HEAD_H} fill="var(--node-stroke)" opacity={0.16} />
      <line x1={0} y1={HEAD_H} x2={w} y2={HEAD_H} stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      <foreignObject x={0} y={0} width={w} height={HEAD_H}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: node.style.fontSize, fontWeight: 700, color: 'var(--node-text)', overflow: 'hidden', pointerEvents: 'none' }}>
          {ctx.editing ? '' : node.text}
        </div>
      </foreignObject>
      <FieldRows node={node} ctx={ctx} />
    </svg>
  )
}
