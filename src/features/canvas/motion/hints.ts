// 动效的一次性提示：调用方在执行命令/打开文档前声明意图，画布同步时消费。
// 都是模块级瞬态，不进文档、不进历史。
import { motionAllowed } from '@/components/motion'
import type { DiagramDoc } from '@/core/model/types'
import { enterSource } from './plan'
import { ENTER_MS, MOTION_MAX, POP_MS } from './timing'

let instantNext = false
let revealId: string | null = null
const enterEnds = new Map<string, number>()

/** 方向键微移等「直接操作」：下一次文档变化直接到位 */
export function skipNextMotion(): void {
  instantNext = true
}
export function takeInstant(): boolean {
  const v = instantNext
  instantNext = false
  return v
}

/** 打开示例/导入：这份文档出现时依次「自绘」（打开自己存的图则不播） */
export function revealNext(docId: string): void {
  revealId = docId
}
export function takeReveal(docId: string): boolean {
  const hit = revealId === docId
  revealId = null
  return hit
}

/** 「加一个节点并立刻编辑」时先登记落位时刻：编辑框在本次渲染就挂载，早于画布的同步 effect */
export function expectEnter(id: string, before: DiagramDoc, after: DiagramDoc): void {
  if (!motionAllowed() || Object.keys(after.nodes).length > MOTION_MAX) return
  const slides = enterSource(id, (x) => !!before.nodes[x], before, after, true) !== null
  markEnter(id, performance.now() + (slides ? ENTER_MS : POP_MS * 0.6))
}
export function markEnter(id: string, end: number): void {
  enterEnds.set(id, end)
}
export function clearEnters(now?: number): void {
  if (now === undefined) enterEnds.clear()
  else for (const [id, end] of enterEnds) if (end <= now) enterEnds.delete(id)
}
/** 节点还要多久落位（ms），不在长出则 0 */
export function enterRemaining(id: string): number {
  const end = enterEnds.get(id)
  return end ? Math.max(0, end - performance.now()) : 0
}
