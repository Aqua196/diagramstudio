// 节点配色常量（SPEC §6）：每色一对「亮/暗」。组件里不得再出现其他节点配色。
export const NODE_COLORS = {
  white: { name: '白', light: '#FFFFFF', dark: '#163A63' },
  gray: { name: '描图灰', light: '#E9EDEF', dark: '#1E4572' },
  teal: { name: '青', light: '#D3EDE8', dark: '#1B5560' },
  blue: { name: '蓝', light: '#D5E2F5', dark: '#25518A' },
  yellow: { name: '荧光黄', light: '#F7E7A1', dark: '#6B5E22' },
  pink: { name: '粉', light: '#F6D5D5', dark: '#6B3340' },
  purple: { name: '紫', light: '#E1DAF3', dark: '#43386B' },
} as const

export type NodeColorKey = keyof typeof NODE_COLORS
export type ThemeName = 'light' | 'dark'

export function isNodeColorKey(key: string): key is NodeColorKey {
  return key in NODE_COLORS
}

/** 节点底色解析：palette key 查表，'ink'/'none'/自定义值原样返回 */
export function resolveFill(key: string, theme: ThemeName): string {
  if (isNodeColorKey(key)) return NODE_COLORS[key][theme]
  return key
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

/** 深色底上的文字色 / 浅色底上的文字色（与 tokens 一致，仅供测试与导出使用） */
export const TEXT_ON = { light: '#1B2430', dark: '#E6EEF7' } as const

/** 主题强调色与其上的文字色（与 tokens.css --accent/--accent-ink 一致） */
export const ACCENT = { light: '#0B7A75', dark: '#4FD1C0' } as const
export const ACCENT_INK = { light: '#FFFFFF', dark: '#0B1F38' } as const
