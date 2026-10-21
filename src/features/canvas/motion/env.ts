// 动效运行环境（可注入）：浏览器里用真实时钟/定时器/系统偏好，单测里换成假时钟驱动。
import { motionAllowed } from '@/components/motion'
import { browserClock, type Clock } from './tween'

export interface MotionEnv {
  clock: Clock
  allowed: () => boolean
  setTimer: (fn: () => void, ms: number) => number
  clearTimer: (h: number) => void
  /** 有动画进行中时在 <html data-motion="busy"> 上标记，e2e 据此等待动画结束 */
  busy: (on: boolean) => void
  /** 页面转场是否正在进行（自绘推迟到卡片形变落地） */
  pageTransition: () => boolean
}

export const browserEnv: MotionEnv = {
  clock: browserClock,
  allowed: motionAllowed,
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (h) => window.clearTimeout(h),
  busy: (on) => {
    if (on) document.documentElement.dataset.motion = 'busy'
    else delete document.documentElement.dataset.motion
  },
  pageTransition: () => document.documentElement.classList.contains('ds-vt-page'),
}
