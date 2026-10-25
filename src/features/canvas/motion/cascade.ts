// 打开示例/导入时的「自绘」编排（纯函数）：节点按 cascadeOrder 依次弹出，
// 连线在起点出现后开始沿路径画向终点，恰好在终点弹出时画到。
import type { CSSProperties } from 'react'
import type { DiagramDoc } from '@/core/model/types'
import { cascadeOrder } from './plan'
import { POP_MS } from './timing'

export interface FxSpec {
  cls: string
  style?: CSSProperties
  /** 从现在起多久后动画结束 */
  dur: number
}

/** 节点展开的总时间窗（超过后步长自动压缩），单条连线描线时长上下限 */
const SPREAD_MS = 700
const STEP_MAX = 55
const DRAW_MIN = 220
const DRAW_MAX = 600

export function cascadeFx(
  doc: DiagramDoc,
  nodeIds: string[],
  edges: Array<{ id: string; source: string; target: string }>,
  base: number,
): { nodes: Map<string, FxSpec>; edges: Map<string, FxSpec> } {
  const order = cascadeOrder(doc, nodeIds)
  const step = order.length > 1 ? Math.min(STEP_MAX, SPREAD_MS / (order.length - 1)) : 0
  const delay = new Map(order.map((id, i) => [id, Math.round(base + i * step)]))
  const nodes = new Map<string, FxSpec>()
  for (const [id, d] of delay) {
    nodes.set(id, {
      cls: 'ds-fx-pop',
      style: { '--ds-delay': `${d}ms` } as CSSProperties,
      dur: d + POP_MS,
    })
  }
  const out = new Map<string, FxSpec>()
  for (const e of edges) {
    const ds = delay.get(e.source) ?? base
    const dt = delay.get(e.target) ?? base
    // 起点出现后开画；顺向在终点弹出时画到，逆向（回边，终点早已出现）用固定时长
    const start = ds + 80
    const span = dt >= ds ? dt - ds + 120 : 280
    const dur = Math.min(DRAW_MAX, Math.max(DRAW_MIN, span))
    out.set(e.id, {
      cls: 'ds-fx-draw',
      style: { '--ds-delay': `${start}ms`, '--ds-dur': `${dur}ms` } as CSSProperties,
      dur: start + dur,
    })
  }
  return { nodes, edges: out }
}
