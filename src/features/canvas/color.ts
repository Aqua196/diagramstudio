// 节点/连线颜色解析：palette key → 当前主题色值；'ink' → 令牌变量；
// 其余字符串原样放行（导出/自定义场景）。
import { isNodeColorKey, NODE_COLORS, TEXT_ON, type ThemeName } from '@/core/palette'

export function resolveNodeColor(key: string, theme: ThemeName): string {
  if (isNodeColorKey(key)) return NODE_COLORS[key][theme]
  if (key === 'ink') return 'var(--ink)'
  if (key === 'none' || key === 'transparent') return 'transparent'
  return key
}

/** 边线颜色：默认 'ink-2' 灰线，选中态由组件覆盖为 var(--accent) */
export function resolveEdgeStroke(key: string): string {
  if (key === 'ink' || key.startsWith('ink-')) return `var(--${key})`
  if (isNodeColorKey(key)) return 'var(--node-stroke)'
  return key
}

/** 节点文字颜色：与 tokens 的 ink 一致（SPEC §6 对比度由单测保证） */
export function nodeTextColor(theme: ThemeName): string {
  return TEXT_ON[theme]
}
