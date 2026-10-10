// 对齐参考线与节点间吸附（SPEC §5）：拖动时把移动节点的
// 边缘/中心吸附到其他节点的边缘/中心，并给出参考线坐标。
import type { Point } from '@/core/model/types'

export interface SnapRect {
  x: number
  y: number
  w: number
  h: number
}

export interface SnapResult {
  dx: number
  dy: number
  /** 命中的垂直参考线（流程坐标 x） */
  guidesV: number[]
  /** 命中的水平参考线（流程坐标 y） */
  guidesH: number[]
}

const SNAP_THRESHOLD = 5

function edgesOf(r: SnapRect): { x: number[]; y: number[] } {
  return {
    x: [r.x, r.x + r.w / 2, r.x + r.w],
    y: [r.y, r.y + r.h / 2, r.y + r.h],
  }
}

function bestDelta(moving: number[], targets: number[]): { d: number; at: number } | null {
  let best: { d: number; at: number } | null = null
  for (const m of moving) {
    for (const t of targets) {
      const d = t - m
      if (Math.abs(d) <= SNAP_THRESHOLD && (best === null || Math.abs(d) < Math.abs(best.d))) {
        best = { d, at: t }
      }
    }
  }
  return best
}

/**
 * 计算吸附增量：返回使 moving 某条边/中心线与任一目标边/中心线对齐的 dx/dy，
 * 以及对齐位置的参考线坐标。未命中返回零增量与空参考线。
 */
export function computeSnap(moving: SnapRect, targets: SnapRect[]): SnapResult {
  const m = edgesOf(moving)
  const tx: number[] = []
  const ty: number[] = []
  for (const t of targets) {
    const e = edgesOf(t)
    tx.push(...e.x)
    ty.push(...e.y)
  }
  const sx = bestDelta(m.x, tx)
  const sy = bestDelta(m.y, ty)
  return {
    dx: sx?.d ?? 0,
    dy: sy?.d ?? 0,
    guidesV: sx ? [sx.at] : [],
    guidesH: sy ? [sy.at] : [],
  }
}

/** 世界坐标 → 文档坐标微调量（方向键）：画布直接调用 ops.moveNodesBy */
export function arrowDelta(key: string, step: number): Point | null {
  switch (key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 }
    case 'ArrowRight':
      return { x: step, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: -step }
    case 'ArrowDown':
      return { x: 0, y: step }
    default:
      return null
  }
}
