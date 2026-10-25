// 一次文档变化的各类动效落账：滑动、长出/弹出、描线、退场残影、「改了哪里」提示圈。
// 每步只往 FxBook/Tweener 里登记，不直接碰 React 状态；pos 收集本帧要覆盖的起始位置。
import type { CSSProperties } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { DiagramDoc } from '@/core/model/types'
import type { FlowEdgeData, FlowNodeData } from '@/store/selectors'
import type { FxBook } from './fxBook'
import { ghostEdge, ghostNode, isGhostEdge } from './ghosts'
import type { MotionPlan, Pt } from './plan'
import { easeOutBack, easeOutCubic, type Tweener } from './tween'
import * as T from './timing'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>
export type Change = 'execute' | 'undo' | 'redo' | 'set' | 'remote'

export interface StepCtx {
  book: FxBook
  tween: Tweener
  now: number
}

const samePt = (a: Pt | undefined, b: Pt) =>
  !!a && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

/** 位移补间：本地命令 320ms、撤销/重做 260ms、协作者改动 200ms；正在长出的节点改目标时保持弹出手感 */
export function stepMoves(
  c: StepCtx,
  moves: MotionPlan['moves'],
  pos: Map<string, Pt>,
  change: Change,
) {
  if (moves.length > T.MOVES_MAX) {
    c.tween.finishAll()
    return
  }
  const dur = change === 'remote' ? T.REMOTE_MS : change === 'execute' ? T.MOVE_MS : T.UNDO_MS
  for (const m of moves) {
    pos.set(m.id, m.from)
    if (samePt(c.tween.target(m.id), m.to)) continue // 已在去往同一目标的路上
    const entering = c.book.nodeFx.get(m.id)?.cls === 'ds-fx-enter'
    const d = Math.max(entering ? T.ENTER_MS * 0.8 : dur, c.tween.remaining(m.id))
    c.tween.start(m.id, m.from, m.to, d, entering ? easeOutBack : easeOutCubic)
  }
}

/** 新节点：有来源的从源中心飞出并长大，没有的原地弹出；返回原地弹出的 id */
export function stepEnters(
  c: StepCtx,
  enters: MotionPlan['enters'],
  nodes: FNode[],
  pos: Map<string, Pt>,
) {
  const target = new Map(nodes.map((n) => [n.id, n.position]))
  const popping = new Set<string>()
  enters.forEach((e, i) => {
    if (e.origin && i < T.FLIGHTS_MAX) {
      pos.set(e.id, e.origin)
      c.tween.start(e.id, e.origin, target.get(e.id)!, T.ENTER_MS, easeOutBack)
      c.book.node(e.id, 'ds-fx-enter', T.ENTER_MS)
    } else if (i < T.POPS_MAX) {
      popping.add(e.id)
      c.book.node(e.id, 'ds-fx-pop', T.POP_MS)
    }
  })
  return popping
}

/** 新连线：一端是原地弹出的节点（粘贴、撤销删除、协作者新增）时沿路径画出；
 *  一端是飞出的节点时线随节点自然伸长；两端早已存在（手动连线，拖线时已画过）则直接出现 */
export function stepDraws(
  c: StepCtx,
  shownEdges: FEdge[],
  nextEdges: FEdge[],
  popping: Set<string>,
) {
  const shown = new Set(shownEdges.map((e) => e.id))
  const style = { '--ds-delay': '120ms', '--ds-dur': `${T.DRAW_MS}ms` } as CSSProperties
  for (const e of nextEdges) {
    if (shown.has(e.id) || !(popping.has(e.source) || popping.has(e.target))) continue
    c.book.edge(e.id, 'ds-fx-draw', 120 + T.DRAW_MS, style)
  }
}

/** 退场：节点留残影（折叠/删子主题时滑回可见祖先），两端仍在画面上的消失连线留淡出的影子 */
export function stepExits(
  c: StepCtx,
  exits: MotionPlan['exits'],
  shown: { byId: Map<string, FNode>; at: Map<string, Pt>; edges: FEdge[] },
  next: { ids: Set<string>; edges: FEdge[] },
) {
  for (const e of next.edges) c.book.ghostEdges.delete(e.id)
  if (exits.length > T.GHOSTS_MAX) return
  const until = c.now + T.EXIT_MS
  for (const x of exits) {
    const was = shown.byId.get(x.id)
    const from = shown.at.get(x.id)
    if (!was || !from) continue
    c.tween.stop(x.id)
    c.book.nodeFx.delete(x.id)
    if (x.toward) c.tween.start(x.id, from, x.toward, T.EXIT_MS, easeOutCubic)
    c.book.ghosts.set(x.id, { node: ghostNode(was, from, !!x.toward), until })
  }
  const present = new Set([...next.ids, ...c.book.ghosts.keys()])
  const keep = new Set(next.edges.map((e) => e.id))
  for (const e of shown.edges) {
    if (keep.has(e.id) || c.book.ghostEdges.has(e.id) || isGhostEdge(e)) continue
    if (!present.has(e.source) || !present.has(e.target)) continue
    c.book.edgeFx.delete(e.id)
    c.book.ghostEdges.set(e.id, { edge: ghostEdge(e), until })
  }
}

/** 撤销/重做/协作者改动后，内容或样式变了的节点闪一圈（位移本身已有滑动，不重复提示） */
export function stepChanged(c: StepCtx, prevDoc: DiagramDoc, doc: DiagramDoc, plan: MotionPlan) {
  const skip = new Set([...plan.enters.map((e) => e.id), ...plan.moves.map((m) => m.id)])
  const ids = Object.keys(doc.nodes).filter(
    (id) =>
      prevDoc.nodes[id] &&
      prevDoc.nodes[id] !== doc.nodes[id] &&
      !skip.has(id) &&
      !c.book.nodeFx.has(id),
  )
  if (ids.length > T.CHANGED_MAX) return
  for (const id of ids) c.book.node(id, 'ds-fx-changed', T.CHANGED_MS)
}
