// 动效账本：哪些节点/连线挂着动画类名、哪些残影还在退场，各自何时到期。
import type { CSSProperties } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { FlowEdgeData, FlowNodeData } from '@/features/canvas/selectors'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>

export interface Fx {
  cls: string
  style?: CSSProperties
  until: number
}

export interface Expired {
  fxDone: Set<string>
  gone: Set<string>
  edgeFxDone: Set<string>
  goneEdges: Set<string>
}

export class FxBook {
  nodeFx = new Map<string, Fx>()
  edgeFx = new Map<string, Fx>()
  ghosts = new Map<string, { node: FNode; until: number }>()
  ghostEdges = new Map<string, { edge: FEdge; until: number }>()

  constructor(private now: () => number) {}

  node(id: string, cls: string, dur: number, style?: CSSProperties): void {
    this.nodeFx.set(id, { cls, style, until: this.now() + dur })
  }

  edge(id: string, cls: string, dur: number, style?: CSSProperties): void {
    this.edgeFx.set(id, { cls, style, until: this.now() + dur })
  }

  get size(): number {
    return this.nodeFx.size + this.edgeFx.size + this.ghosts.size + this.ghostEdges.size
  }

  /** 最早的到期时刻（空则 Infinity） */
  soonest(): number {
    let t = Infinity
    for (const m of [this.nodeFx, this.edgeFx, this.ghosts, this.ghostEdges]) {
      for (const v of m.values()) t = Math.min(t, v.until)
    }
    return t
  }

  /** 取出并删除到期项 */
  expire(now: number): Expired {
    const take = <V extends { until: number }>(m: Map<string, V>) => {
      const out = new Set<string>()
      for (const [id, v] of m) if (v.until <= now) out.add(id)
      for (const id of out) m.delete(id)
      return out
    }
    return {
      fxDone: take(this.nodeFx),
      gone: take(this.ghosts),
      edgeFxDone: take(this.edgeFx),
      goneEdges: take(this.ghostEdges),
    }
  }

  clearGhosts(): void {
    this.ghosts.clear()
    this.ghostEdges.clear()
  }

  clear(): void {
    this.nodeFx.clear()
    this.edgeFx.clear()
    this.clearGhosts()
  }
}
