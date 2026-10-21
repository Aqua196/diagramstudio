// 快捷键展示：Mac 显示 ⌘/⇧，其余平台显示 Ctrl/Shift（仅影响文案，不影响按键判断）。
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function keyLabel(combo: string): string {
  if (!isMac) return combo
  return combo
    .replace(/Ctrl\+/g, '⌘')
    .replace(/Shift\+/g, '⇧')
    .replace(/Alt\+/g, '⌥')
}
