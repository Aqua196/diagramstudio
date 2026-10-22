// 画布动效编排（纯视图层）：每次文档变化时拿「当前画面」与「新文档派生的节点」比对（planMotion），
// 决定谁滑到新位置、谁从父/源节点长出、谁收回或淡出、哪些连线自己画出来、撤销后哪里闪一下。
// 只改 React Flow 本地 nodes/edges 的 position/className/style，从不写文档与历史；
// 减少动态效果或画面节点 > MOTION_MAX 时整体关闭，行为与无动效完全一致。
import type { CSSProperties } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { DiagramDoc } from '@/core/model/types'
import type { FlowEdgeData, FlowNodeData } from '@/store/selectors'
import { cascadeFx } from './cascade'
import { browserEnv, type MotionEnv } from './env'
import { FxBook } from './fxBook'
import { isGhostEdge } from './ghosts'
import { takeInstant, takeReveal } from './hints'
import { composeLists, plain, toView, type Lists } from './compose'
import { planMotion, type Pt, type ViewNode } from './plan'
import { stepChanged, stepDraws, stepEnters, stepExits, stepMoves, type Change, type StepCtx } from './steps'
import { Tweener } from './tween'
import * as T from './timing'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>
type SetList<T> = (fn: (list: T[]) => T[]) => void

/** 连线描线时长/延迟通过 CSS 变量交给 DsEdge */
export type EdgeFxStyle = CSSProperties & { '--ds-delay'?: string; '--ds-dur'?: string }

export interface ReconcileInput {
  doc: DiagramDoc
  change: Change
  /** 当前画面上的元素（含残影） */
  shown: Lists
  /** 由新文档派生的元素 */
  next: Lists
}

let active: CanvasMotion | null = null
const setActive = (m: CanvasMotion | null) => (active = m)
/** 导出等需要「最终画面」的场合：所有动画立即到终点；返回此前是否有动画在播 */
export function finishCanvasMotion(): boolean {
  return active?.finish() ?? false
}

export class CanvasMotion {
  private tween: Tweener
  private book: FxBook
  private timer = 0
  private timerAt = 0
  /** 上一次对账的文档（卸载时清空：StrictMode 的模拟重挂载也按「新打开」处理） */
  private lastDoc: DiagramDoc | null = null

  constructor(
    private setNodes: SetList<FNode>,
    private setEdges: SetList<FEdge>,
    private env: MotionEnv = browserEnv,
  ) {
    this.book = new FxBook(env.clock.now)
    this.tween = new Tweener(
      (f) => this.setNodes((ns) => ns.map((n) => (f.has(n.id) ? { ...n, position: f.get(n.id)! } : n))),
      env.clock,
    )
  }

  reconcile(input: ReconcileInput): Lists {
    setActive(this)
    const { doc, change, next } = input
    const instant = takeInstant()
    const prevDoc = this.lastDoc
    this.lastDoc = doc
    const opened = !prevDoc || prevDoc.id !== doc.id
    const reveal = opened && takeReveal(doc.id)
    if (!this.env.allowed() || next.nodes.length > T.MOTION_MAX) {
      this.reset()
      return next
    }
    let pos = new Map<string, Pt>()
    if (opened) {
      this.reset()
      if (reveal && next.nodes.length <= T.CASCADE_MAX) this.cascade(doc, next)
    } else if (change === 'set' || instant) {
      // 打开后的位置回写（'set'）与键盘微移：直接到位，保留进行中的自绘
      this.tween.finishAll()
      this.book.clearGhosts()
    } else {
      pos = this.animate(input, prevDoc!)
    }
    this.schedule()
    return composeLists(this.book, this.tween, next, pos)
  }

  /** 拖动接管：停下这些节点的补间（停在当前插值位置，由 React Flow 接着拖） */
  release(ids: Iterable<string>): void {
    for (const id of ids) this.tween.stop(id)
  }

  /** 全部跳到终点、摘掉动画类名、移除残影（一次 setNodes/setEdges）；返回此前是否有动画 */
  finish(): boolean {
    if (this.tween.size + this.book.size === 0) return false
    const targets = this.tween.finishAll()
    const gone = new Set(this.book.ghosts.keys())
    const goneEdges = new Set(this.book.ghostEdges.keys())
    this.book.clear()
    this.setNodes((ns) =>
      ns
        .filter((n) => !(n.data.ghost && gone.has(n.id)))
        .map((n) => plain(targets.has(n.id) ? { ...n, position: targets.get(n.id)! } : n)),
    )
    this.setEdges((es) => es.filter((e) => !(isGhostEdge(e) && goneEdges.has(e.id))).map(plain))
    this.env.busy(false)
    return true
  }

  dispose(): void {
    this.reset()
    this.lastDoc = null
    if (active === this) setActive(null)
  }

  private animate({ doc, change, shown, next }: ReconcileInput, prevDoc: DiagramDoc): Map<string, Pt> {
    const ids = new Set(next.nodes.map((n) => n.id))
    const byId = new Map<string, FNode>()
    const view: ViewNode[] = []
    for (const n of shown.nodes) {
      // 还在退场的残影若又回到文档（撤销删除、折叠后立刻展开），从它此刻的位置折返
      if (n.data.ghost && !ids.has(n.id)) continue
      if (n.data.ghost) this.book.ghosts.delete(n.id)
      byId.set(n.id, n)
      view.push(toView(n, this.tween.at(n.id) ?? n.position))
    }
    const dragging = new Set(shown.nodes.filter((n) => n.dragging).map((n) => n.id))
    const plan = planMotion(view, next.nodes.map((n) => toView(n)), prevDoc, doc, {
      dragging,
      edgeSources: change === 'execute' || change === 'redo',
      minMove: T.MIN_MOVE_PX,
    })
    const at = new Map(view.map((v) => [v.id, v.position]))
    const pos = new Map<string, Pt>()
    // 正在被拖的节点保持手上的位置（协作者改动到达时不把它拽回文档位置）
    for (const id of dragging) if (at.has(id)) pos.set(id, at.get(id)!)
    const c: StepCtx = { book: this.book, tween: this.tween, now: this.env.clock.now() }
    stepMoves(c, plan.moves, pos, change)
    const popping = stepEnters(c, plan.enters, next.nodes, pos)
    stepDraws(c, shown.edges, next.edges, popping)
    stepExits(c, plan.exits, { byId, at, edges: shown.edges }, { ids, edges: next.edges })
    if (change !== 'execute') stepChanged(c, prevDoc, doc, plan)
    return pos
  }

  /** 打开示例/导入：依次自绘；页面形变进行中则等卡片落地再开始 */
  private cascade(doc: DiagramDoc, next: Lists): void {
    const base = this.env.pageTransition() ? 340 : 120
    const fx = cascadeFx(doc, next.nodes.map((n) => n.id), next.edges, base)
    for (const [id, f] of fx.nodes) this.book.node(id, f.cls, f.dur, f.style)
    for (const [id, f] of fx.edges) this.book.edge(id, f.cls, f.dur, f.style)
  }

  private reset(): void {
    this.tween.finishAll()
    this.book.clear()
    if (this.timer) this.env.clearTimer(this.timer)
    this.timer = 0
    this.env.busy(false)
  }

  /** 到期清理排程：CSS 动画从节点 DOM 挂载时起算，会比这里记的时刻晚一两帧，留 80ms 余量 */
  private schedule(): void {
    const soonest = Math.min(this.book.soonest(), this.tween.size ? this.tween.endTime() : Infinity)
    if (soonest === Infinity) return this.env.busy(false)
    this.env.busy(true)
    const now = this.env.clock.now()
    const at = Math.max(soonest + 80, now + 120)
    if (this.timer && this.timerAt <= at) return
    if (this.timer) this.env.clearTimer(this.timer)
    this.timerAt = at
    this.timer = this.env.setTimer(() => {
      this.timer = 0
      this.sweep()
    }, at - now)
  }

  /** 到期的残影移除、动画类名摘掉（否则节点因视口裁剪重新挂载时会重播） */
  private sweep(): void {
    const now = this.env.clock.now()
    const { fxDone, gone, edgeFxDone, goneEdges } = this.book.expire(now)
    for (const id of gone) this.tween.stop(id)
    if (fxDone.size || gone.size) {
      this.setNodes((ns) =>
        ns
          .filter((n) => !(n.data.ghost && gone.has(n.id)))
          .map((n) => (fxDone.has(n.id) && !n.data.ghost ? plain(n) : n)),
      )
    }
    if (edgeFxDone.size || goneEdges.size) {
      this.setEdges((es) =>
        es
          .filter((e) => !(isGhostEdge(e) && goneEdges.has(e.id)))
          .map((e) => (edgeFxDone.has(e.id) && !isGhostEdge(e) ? plain(e) : e)),
      )
    }
    this.schedule()
  }
}
