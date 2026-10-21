// 位置补间：插值、到点即止、中途改目标、卡顿收尾。时钟与帧调度用假的手动推进。
import { describe, expect, it } from 'vitest'
import type { Pt } from './plan'
import { easeOutBack, easeOutCubic, Tweener, type Clock } from './tween'

function fakeClock() {
  let t = 0
  let cb: (() => void) | null = null
  const clock: Clock = {
    now: () => t,
    request: (fn) => {
      cb = fn
      return 1
    },
    cancel: () => {
      cb = null
    },
  }
  /** 时间前进 ms 后跑一帧 */
  const tick = (ms: number) => {
    t += ms
    const fn = cb
    cb = null
    fn?.()
  }
  return { clock, tick, pending: () => cb !== null }
}

const linear = (k: number) => k

describe('Tweener', () => {
  it('按缓动插值，到点后写下精确终点并停止调度', () => {
    const { clock, tick, pending } = fakeClock()
    const frames: Array<Map<string, Pt>> = []
    const tw = new Tweener((f) => frames.push(f), clock)
    tw.start('a', { x: 0, y: 0 }, { x: 100, y: 0 }, 100, linear)
    tick(16)
    tick(34)
    expect(frames.at(-1)!.get('a')!.x).toBeCloseTo(50)
    expect(tw.at('a')!.x).toBeCloseTo(50)
    tick(16)
    tick(16)
    tick(30)
    expect(frames.at(-1)!.get('a')).toEqual({ x: 100, y: 0 })
    expect(tw.size).toBe(0)
    expect(pending()).toBe(false)
  })

  it('stop 让位给拖动：之后的帧不再写它', () => {
    const { clock, tick } = fakeClock()
    const frames: Array<Map<string, Pt>> = []
    const tw = new Tweener((f) => frames.push(f), clock)
    tw.start('a', { x: 0, y: 0 }, { x: 100, y: 0 }, 100, linear)
    tw.start('b', { x: 0, y: 0 }, { x: 0, y: 100 }, 100, linear)
    tick(16)
    tw.stop('a')
    tick(16)
    expect(frames.at(-1)!.has('a')).toBe(false)
    expect(frames.at(-1)!.has('b')).toBe(true)
  })

  it('finishAll 返回全部终点并清空；remaining/endTime 反映剩余时长', () => {
    const { clock, tick } = fakeClock()
    const tw = new Tweener(() => undefined, clock)
    tw.start('a', { x: 0, y: 0 }, { x: 10, y: 20 }, 300)
    tick(16)
    tick(84)
    expect(tw.remaining('a')).toBe(200)
    expect(tw.endTime()).toBe(300)
    expect(tw.finishAll()).toEqual(new Map([['a', { x: 10, y: 20 }]]))
    expect(tw.size).toBe(0)
  })

  it('连续两帧间隔超过 50ms（设备跟不上）直接跳到终点', () => {
    const { clock, tick } = fakeClock()
    const frames: Array<Map<string, Pt>> = []
    const tw = new Tweener((f) => frames.push(f), clock)
    tw.start('a', { x: 0, y: 0 }, { x: 100, y: 0 }, 1000, linear)
    // 头两帧慢（触发补间的那次大提交）不算
    tick(120)
    tick(120)
    expect(tw.size).toBe(1)
    tick(60)
    tick(60)
    expect(frames.at(-1)!.get('a')).toEqual({ x: 100, y: 0 })
    expect(tw.size).toBe(0)
  })

  it('缓动曲线端点正确，弹出曲线中途越过终点', () => {
    for (const ease of [easeOutCubic, easeOutBack]) {
      expect(ease(0)).toBeCloseTo(0)
      expect(ease(1)).toBeCloseTo(1)
    }
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(easeOutBack))).toBeGreaterThan(1)
  })
})
