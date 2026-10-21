// 连线几何：三种路由的路径 + 标注落点。折线的「中心点」用路径实测中点，
// 保证 L 形折线的标注落在线上而不是悬空在拐角外侧。
import { getBezierPath, getSmoothStepPath, getStraightPath, Position } from '@xyflow/react'

export interface EdgeEnds {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
}

let probe: SVGPathElement | null = null

/** 路径长度中点（浏览器实测）；jsdom 等不支持时返回 null 由调用方回退 */
function midpointOf(d: string): { x: number; y: number } | null {
  try {
    probe ??= document.createElementNS('http://www.w3.org/2000/svg', 'path')
    probe.setAttribute('d', d)
    const len = probe.getTotalLength()
    const p = probe.getPointAtLength(len / 2)
    return { x: p.x, y: p.y }
  } catch {
    return null
  }
}

/** 两端正对（同一竖线/横线且朝向相对）时折线退化为直线，避免亚像素偏差画出小锯齿 */
function aligned(p: EdgeEnds): boolean {
  const { sourcePosition: s, targetPosition: t } = p
  const vertical =
    (s === Position.Bottom && t === Position.Top) || (s === Position.Top && t === Position.Bottom)
  const horizontal =
    (s === Position.Right && t === Position.Left) || (s === Position.Left && t === Position.Right)
  return (
    (vertical && Math.abs(p.sourceX - p.targetX) < 1.5) ||
    (horizontal && Math.abs(p.sourceY - p.targetY) < 1.5)
  )
}

export function pathFor(
  routing: string,
  p: EdgeEnds,
  measureLabel: boolean,
): [string, number, number] {
  if (routing === 'step' && aligned(p)) {
    const r = getStraightPath(p)
    return [r[0], r[1], r[2]]
  }
  if (routing === 'step') {
    const [d, lx, ly] = getSmoothStepPath({ ...p, borderRadius: 10, offset: 16 })
    const mid = measureLabel ? midpointOf(d) : null
    return [d, mid?.x ?? lx, mid?.y ?? ly]
  }
  const r = routing === 'straight' ? getStraightPath(p) : getBezierPath(p)
  return [r[0], r[1], r[2]]
}
