// 动效规划（纯函数）：比较「当前画面上的节点」与「由新文档派生的节点」，决定谁滑动、谁长出、谁退场。
// 只产出视图层补间，不碰文档与历史；输入输出都是普通对象，便于单测。
import type { DiagramDoc } from '@/core/model/types'

export interface Pt {
  x: number
  y: number
}

/** 画面上一个节点的最小描述（React Flow 本地节点的子集） */
export interface ViewNode {
  id: string
  position: Pt
  width?: number
  height?: number
}

export interface MotionPlan {
  /** 需要补间的节点：from 为当前画面位置，to 为文档目标位置 */
  moves: Array<{ id: string; from: Pt; to: Pt }>
  /** 新出现的节点：从 origin（父/源节点中心换算的左上角）长出；无 origin 则原地弹出 */
  enters: Array<{ id: string; origin: Pt | null }>
  /** 退场节点：toward 为收拢目标（折叠/删除子主题时是可见祖先），null 表示原地缩小淡出 */
  exits: Array<{ id: string; toward: Pt | null }>
}

export interface PlanOptions {
  /** 正在被拖动的节点不补间 */
  dragging?: ReadonlySet<string>
  /** 允许从「新连线另一端」飞出（只在本地新建/重做时；撤销删除、协作者改动应原地出现） */
  edgeSources?: boolean
  /** 小于此位移不补间 */
  minMove?: number
}

const center = (n: ViewNode): Pt => ({
  x: n.position.x + (n.width ?? 0) / 2,
  y: n.position.y + (n.height ?? 0) / 2,
})

/** 让 child 的中心与 anchor 的中心重合时，child 左上角的位置 */
function topLeftAt(anchor: ViewNode, child: ViewNode): Pt {
  const c = center(anchor)
  return { x: c.x - (child.width ?? 0) / 2, y: c.y - (child.height ?? 0) / 2 }
}

const parentOf = (doc: DiagramDoc, id: string): string | null => {
  const p = doc.nodes[id]?.data?.parentId
  return typeof p === 'string' ? p : null
}

/** 沿 parentId 向上找第一个满足 ok 的祖先（防环） */
function ancestor(doc: DiagramDoc, id: string, ok: (id: string) => boolean): string | null {
  const seen = new Set<string>([id])
  let cur = parentOf(doc, id)
  while (cur && !seen.has(cur)) {
    if (ok(cur)) return cur
    seen.add(cur)
    cur = parentOf(doc, cur)
  }
  return null
}

/** 新节点的来源 id：最近的已存在祖先（展开时整棵子树都从被点的节点散开），
 *  或（edgeSources 时）新连线另一端的已有节点 */
export function enterSource(
  id: string,
  existed: (id: string) => boolean,
  prevDoc: DiagramDoc,
  nextDoc: DiagramDoc,
  edgeSources: boolean,
): string | null {
  const anc = ancestor(nextDoc, id, existed)
  if (anc) return anc
  if (!edgeSources) return null
  for (const e of Object.values(nextDoc.edges)) {
    if (prevDoc.edges[e.id]) continue
    const other = e.source === id ? e.target : e.target === id ? e.source : null
    if (other && existed(other)) return other
  }
  return null
}

/** 退场节点的收拢目标：仍可见的最近祖先——折叠时子树收回父节点；
 *  删除/撤销加子主题时新文档里已没有它，按旧文档的父链找；没有父子关系的图原地缩小 */
function exitTarget(
  n: ViewNode,
  next: Map<string, ViewNode>,
  prevDoc: DiagramDoc,
  nextDoc: DiagramDoc,
) {
  const doc = nextDoc.nodes[n.id] ? nextDoc : prevDoc
  const anc = ancestor(doc, n.id, (id) => next.has(id))
  return anc ? topLeftAt(next.get(anc)!, n) : null
}

export function planMotion(
  prevView: ViewNode[],
  nextView: ViewNode[],
  prevDoc: DiagramDoc,
  nextDoc: DiagramDoc,
  opts: PlanOptions = {},
): MotionPlan {
  const { dragging = new Set<string>(), edgeSources = true, minMove = 0.5 } = opts
  const prev = new Map(prevView.map((n) => [n.id, n]))
  const next = new Map(nextView.map((n) => [n.id, n]))
  const plan: MotionPlan = { moves: [], enters: [], exits: [] }
  for (const n of nextView) {
    const was = prev.get(n.id)
    if (!was) {
      const src = enterSource(n.id, (id) => prev.has(id), prevDoc, nextDoc, edgeSources)
      plan.enters.push({ id: n.id, origin: src ? topLeftAt(prev.get(src)!, n) : null })
      continue
    }
    const d = Math.hypot(was.position.x - n.position.x, was.position.y - n.position.y)
    if (!dragging.has(n.id) && d >= minMove) {
      plan.moves.push({ id: n.id, from: { ...was.position }, to: { ...n.position } })
    }
  }
  for (const n of prevView) {
    if (!next.has(n.id))
      plan.exits.push({ id: n.id, toward: exitTarget(n, next, prevDoc, nextDoc) })
  }
  return plan
}

/** 打开文档时的「自绘」次序：从无入边的根出发广度优先（连线与 parentId 都算边） */
export function cascadeOrder(doc: DiagramDoc, visible: string[]): string[] {
  const vis = new Set(visible)
  const out = new Map<string, string[]>()
  const indeg = new Map<string, number>(visible.map((id) => [id, 0]))
  const link = (a: string, b: string) => {
    if (!vis.has(a) || !vis.has(b) || a === b) return
    out.set(a, [...(out.get(a) ?? []), b])
    indeg.set(b, (indeg.get(b) ?? 0) + 1)
  }
  for (const e of Object.values(doc.edges)) link(e.source, e.target)
  for (const id of visible) {
    const p = parentOf(doc, id)
    if (p) link(p, id)
  }
  const seen = new Set<string>()
  const order: string[] = []
  const queue = visible.filter((id) => (indeg.get(id) ?? 0) === 0)
  // 环（如流程图回边）里没有零入度的点：剩下的按文档顺序补上
  for (let i = 0; order.length < visible.length; i++) {
    if (i >= queue.length) queue.push(visible.find((v) => !seen.has(v))!)
    const id = queue[i]
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
    for (const nb of out.get(id) ?? []) if (!seen.has(nb)) queue.push(nb)
  }
  return order
}
