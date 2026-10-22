// 动效的一次性提示：调用方在执行命令/打开文档前声明意图，画布同步时消费。
// 都是模块级瞬态，不进文档、不进历史。
let instantNext = false
let reveal: { id: string; until: number } | null = null
/** 自绘提示的有效期：打开动作到画布挂载之间隔着页面转场（≈ 一帧 + 40ms），留足余量 */
const REVEAL_WINDOW_MS = 1500

/** 方向键微移等「直接操作」：下一次文档变化直接到位 */
export function skipNextMotion(): void {
  instantNext = true
}
export function takeInstant(): boolean {
  const v = instantNext
  instantNext = false
  return v
}

/** 打开示例/导入：这份文档出现时依次「自绘」（打开自己存的图则不播）。
 *  不是一次性消费：StrictMode 的模拟卸载/重挂载会对同一份文档对账两次，第二次也要播 */
export function revealNext(docId: string): void {
  reveal = { id: docId, until: performance.now() + REVEAL_WINDOW_MS }
}
export function takeReveal(docId: string): boolean {
  if (!reveal) return false
  if (reveal.id === docId && performance.now() < reveal.until) return true
  reveal = null
  return false
}
