// 位置补间：一个 rAF 循环驱动所有正在动的节点，每帧只把它们的插值位置交给 apply。
// 中途改目标时从当前插值位置接着走（不跳回起点）；连续两帧间隔过长（设备跟不上）直接跳到终点。
// 时钟与调度可注入，便于单测。
import type { Pt } from './plan'

export type Ease = (t: number) => number

export const easeOutCubic: Ease = (t) => 1 - (1 - t) ** 3
/** 末段轻微越过再回落，只用于「从父/源节点弹出」这类小位移到达 */
export const easeOutBack: Ease = (t) => {
  const c1 = 0.9
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

interface Anim {
  from: Pt
  to: Pt
  t0: number
  dur: number
  ease: Ease
}

export interface Clock {
  now: () => number
  request: (cb: () => void) => number
  cancel: (h: number) => void
}

export const browserClock: Clock = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (h) => cancelAnimationFrame(h),
}

/** 两帧间隔超过它记一次「卡顿」，连续两次就收尾 */
const JANK_MS = 50

const lerp = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })

export class Tweener {
  private anims = new Map<string, Anim>()
  private handle = 0
  private last = 0
  private janks = 0

  constructor(
    private apply: (frame: Map<string, Pt>) => void,
    private clock: Clock = browserClock,
  ) {}

  get size(): number {
    return this.anims.size
  }

  target(id: string): Pt | undefined {
    return this.anims.get(id)?.to
  }

  /** 此刻的插值位置（不在动则 undefined） */
  at(id: string): Pt | undefined {
    const a = this.anims.get(id)
    return a ? lerp(a.from, a.to, a.ease(this.progress(a, this.clock.now()))) : undefined
  }

  /** 剩余时长（ms），不在动为 0 */
  remaining(id: string): number {
    const a = this.anims.get(id)
    return a ? Math.max(0, a.t0 + a.dur - this.clock.now()) : 0
  }

  /** 所有补间里最晚的结束时刻（无则 0） */
  endTime(): number {
    let end = 0
    for (const a of this.anims.values()) end = Math.max(end, a.t0 + a.dur)
    return end
  }

  start(id: string, from: Pt, to: Pt, dur: number, ease: Ease = easeOutCubic): void {
    this.anims.set(id, { from: { ...from }, to: { ...to }, t0: this.clock.now(), dur, ease })
    if (!this.handle) {
      this.last = this.clock.now()
      this.janks = 0
      this.handle = this.clock.request(this.frame)
    }
  }

  /** 停在当前位置（拖动接管时用）；不再回调 apply */
  stop(id: string): void {
    this.anims.delete(id)
  }

  /** 全部跳到终点：返回各自目标位置并清空（调用方负责一次性写回） */
  finishAll(): Map<string, Pt> {
    const out = new Map<string, Pt>()
    for (const [id, a] of this.anims) out.set(id, { ...a.to })
    this.anims.clear()
    if (this.handle) this.clock.cancel(this.handle)
    this.handle = 0
    return out
  }

  private progress(a: Anim, now: number): number {
    return Math.min(1, Math.max(0, (now - a.t0) / a.dur))
  }

  private frame = (): void => {
    this.handle = 0
    const now = this.clock.now()
    this.janks = now - this.last > JANK_MS ? this.janks + 1 : 0
    this.last = now
    if (this.janks >= 2) {
      this.apply(this.finishAll())
      return
    }
    const out = new Map<string, Pt>()
    for (const [id, a] of this.anims) {
      const t = this.progress(a, now)
      out.set(id, t >= 1 ? { ...a.to } : lerp(a.from, a.to, a.ease(t)))
      if (t >= 1) this.anims.delete(id)
    }
    if (this.anims.size) this.handle = this.clock.request(this.frame)
    if (out.size) this.apply(out)
  }
}
