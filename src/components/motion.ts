// 动效总开关：系统开启「减少动态效果」（或环境不支持 matchMedia，如单测）时一律不播装饰性动效。
export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
