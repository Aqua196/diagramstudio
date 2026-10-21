// 节点配色常量（SPEC §6，UI 改版）：每色一对「亮/暗」底色 + 同色相描边。
// 组件里不得再出现其他节点配色；描边为 'ink'（默认）时跟随底色取同色相描边。
export const NODE_COLORS = {
  white: { name: '白', light: '#FFFFFF', dark: '#26262A' },
  gray: { name: '灰', light: '#EFEFEC', dark: '#2E2E33' },
  teal: { name: '青', light: '#DDF3EE', dark: '#12352F' },
  blue: { name: '蓝', light: '#DEEBFC', dark: '#15294A' },
  yellow: { name: '黄', light: '#FCF1C7', dark: '#3A3010' },
  pink: { name: '红', light: '#FBE0E3', dark: '#3E1C22' },
  purple: { name: '紫', light: '#E9E4FB', dark: '#2A2148' },
} as const

export type NodeColorKey = keyof typeof NODE_COLORS
export type ThemeName = 'light' | 'dark'

/** 与底色同色相的描边（亮/暗），保证形状轮廓清晰又不刺眼 */
export const NODE_STROKES: Record<NodeColorKey, Record<ThemeName, string>> = {
  white: { light: '#45453F', dark: '#9A9AA2' },
  gray: { light: '#77776F', dark: '#7D7D86' },
  teal: { light: '#1F8A78', dark: '#3FBFA6' },
  blue: { light: '#3069C9', dark: '#5B93F0' },
  yellow: { light: '#B5880C', dark: '#D9A92A' },
  pink: { light: '#CC4B5C', dark: '#E66B7D' },
  purple: { light: '#6E56CF', dark: '#9B87F5' },
}

export function isNodeColorKey(key: string): key is NodeColorKey {
  return key in NODE_COLORS
}

/** 节点底色解析：palette key 查表，'ink'/'none'/自定义值原样返回 */
export function resolveFill(key: string, theme: ThemeName): string {
  if (isNodeColorKey(key)) return NODE_COLORS[key][theme]
  return key
}

/** 描边解析：'ink'（默认）跟随底色的同色相描边；palette key 取该色描边；其余原样 */
export function resolveStroke(stroke: string, fill: string, theme: ThemeName): string {
  if (stroke === 'ink') return NODE_STROKES[isNodeColorKey(fill) ? fill : 'white'][theme]
  if (isNodeColorKey(stroke)) return NODE_STROKES[stroke][theme]
  return stroke
}

/** WCAG 对比度（SPEC 要求单元测试验证每对配色 ≥4.5:1）：亮色在上 */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA)
  const b = luminance(hexB)
  const [hi, lo] = a >= b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 节点文字色（与 tokens --ink 一致，仅供测试与导出使用） */
export const TEXT_ON = { light: '#1C1C1A', dark: '#EDEDEF' } as const

/** 主题强调色与其上的文字色（与 tokens.css --accent/--accent-ink 一致） */
export const ACCENT = { light: '#5B5BD6', dark: '#8B8DFF' } as const
export const ACCENT_INK = { light: '#FFFFFF', dark: '#141416' } as const

/** 浮动面板底色（与 tokens --surface 一致）：强调色作为文字/图标时也须 ≥4.5:1 */
export const SURFACE = { light: '#FFFFFF', dark: '#1F1F22' } as const
