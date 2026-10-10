// 对齐吸附：5px 阈值内产生参考线与位移，超出不吸附。
import { describe, expect, it } from 'vitest'
import { arrowDelta, computeSnap } from './guides'

describe('computeSnap', () => {
  const others = [
    { id: 'o1', x: 100, y: 100, w: 60, h: 40 },
    { id: 'o2', x: 300, y: 200, w: 80, h: 50 },
  ]

  it('左缘与其他节点左缘在阈值内 → dx 吸附 + 竖直参考线', () => {
    const r = computeSnap({ x: 97, y: 400, w: 60, h: 40 }, others)
    expect(r.dx).toBe(3) // 97 + 3 = 100
    expect(r.guidesV).toContain(100)
    expect(r.guidesH).toHaveLength(0)
  })

  it('中心对齐：节点中线与另一节点中线在阈值内', () => {
    // o1 垂直中线 y = 120；h=30 保证只有「顶边→中线」在阈值内（dy=3）
    const r = computeSnap({ x: 400, y: 117, w: 60, h: 30 }, others)
    expect(r.dy).toBe(3)
    expect(r.guidesH).toContain(120)
  })

  it('超出 5px 阈值不吸附', () => {
    const r = computeSnap({ x: 110, y: 110, w: 60, h: 40 }, others)
    expect(r.dx).toBe(0)
    expect(r.dy).toBe(0)
  })

  it('空场景无参考线', () => {
    const r = computeSnap({ x: 0, y: 0, w: 10, h: 10 }, [])
    expect(r.guidesV).toHaveLength(0)
    expect(r.guidesH).toHaveLength(0)
  })
})

describe('arrowDelta', () => {
  it('方向键按步长给位移（画布侧 1px / Shift+10px）', () => {
    expect(arrowDelta('ArrowLeft', 1)).toEqual({ x: -1, y: 0 })
    expect(arrowDelta('ArrowUp', 1)).toEqual({ x: 0, y: -1 })
    expect(arrowDelta('ArrowRight', 10)).toEqual({ x: 10, y: 0 })
    expect(arrowDelta('ArrowDown', 10)).toEqual({ x: 0, y: 10 })
    expect(arrowDelta('x', 1)).toBeNull()
  })
})
