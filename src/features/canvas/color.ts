// 节点/连线颜色解析：palette key → 当前主题色值；'ink' 描边跟随底色同色相；
// 其余字符串原样放行（导出/自定义场景）。
import {
  isNodeColorKey,
  NODE_COLORS,
  NODE_STROKES,
  resolveStroke,
  TEXT_ON,
  type ThemeName,
} from '@/core/palette'

export function resolveNodeColor(key: string, theme: ThemeName): string {
  if (isNodeColorKey(key)) return NODE_COLORS[key][theme]
  if (key === 'ink') return 'var(--ink)'
  if (key === 'none' || key === 'transparent') return 'transparent'
  return key
}

export function resolveNodeStroke(stroke: string, fill: string, theme: ThemeName): string {
  return resolveStroke(stroke, fill, theme)
}

/** 边线颜色：默认 'ink-2' 走 --edge 令牌；palette key（思维导图分支）取该色描边 */
export function resolveEdgeStroke(key: string, theme: ThemeName): string {
  if (key === 'ink' || key === 'ink-2') return 'var(--edge)'
  if (key.startsWith('ink-')) return `var(--${key})`
  if (isNodeColorKey(key)) return NODE_STROKES[key][theme]
  return key
}

/** 节点文字颜色：与 tokens 的 ink 一致（SPEC §6 对比度由单测保证） */
export function nodeTextColor(theme: ThemeName): string {
  return TEXT_ON[theme]
}
