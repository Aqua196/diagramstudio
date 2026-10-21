// 画布动效编排：用假时钟/假定时器驱动 reconcile → 补间帧 → 到期清理，验证只动视图、不碰文档。
import { beforeEach, describe, expect, it } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import type { FlowEdgeData, FlowNodeData } from '@/store/selectors'
import { deriveEdges, deriveNodes } from '../derive'
import { CanvasMotion } from './canvasMotion'
import type { MotionEnv } from './env'
import { revealNext, skipNextMotion, takeInstant, takeReveal } from './hints'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>
type Change = 'execute' | 'undo' | 'redo' | 'set' | 'remote'

const plugin = getPlugin('mindmap')
const NO_SEL = { nodeIds: [], edgeIds: [] }

function topic(id: string, x: number, y: number, parentId: string | null, text = id): DiagramNode {
  const n = createNode('topic', { x, y }, { w: 100, h: 40 }, text)
  n.id = id
  n.data = { parentId }
  return n
}

function mindDoc(id: string, nodes: DiagramNode[]): DiagramDoc {
  const d = createDoc('mindmap')
  d.id = id
  for (const n of nodes) d.nodes[n.id] = n
  d.zOrder = nodes.map((n) => n.id)
  return d
}

function harness(allowed = true) {
  let t = 0
  let frame: (() => void) | null = null
  let seq = 0
  let busy = false
  const timers: Array<{ at: number; fn: () => void; id: number }> = []
  const env: MotionEnv = {
    clock: {
      now: () => t,
      request: (fn) => ((frame = fn), 1),
      cancel: () => void (frame = null),
    },
    allowed: () => allowed,
    setTimer: (fn, ms) => {
      timers.push({ at: t + ms, fn, id: ++seq })
      return seq
    },
    clearTimer: (id) => {
      const i = timers.findIndex((x) => x.id === id)
      if (i >= 0) timers.splice(i, 1)
    },
    busy: (on) => void (busy = on),
    pageTransition: () => false,
  }
  const state = { nodes: [] as FNode[], edges: [] as FEdge[] }
  const m = new CanvasMotion(
    (fn) => void (state.nodes = fn(state.nodes)),
    (fn) => void (state.edges = fn(state.edges)),
    env,
  )
  const sync = (doc: DiagramDoc, change: Change) => {
    const next = {
      nodes: deriveNodes(doc, plugin, state.nodes, NO_SEL),
      edges: deriveEdges(doc, plugin, state.edges, NO_SEL),
    }
    const out = m.reconcile({ doc, change, shown: { ...state }, next })
    state.nodes = out.nodes
    state.edges = out.edges
    return next
  }
  /** 时间前进：按 16ms 一帧跑补间，并触发到期的定时器 */
  const advance = (ms: number) => {
    const end = t + ms
    while (t < end) {
      t = Math.min(end, t + 16)
      const f = frame
      frame = null
      f?.()
      for (const x of timers.filter((x) => x.at <= t)) {
        timers.splice(timers.indexOf(x), 1)
        x.fn()
      }
    }
  }
  const get = (id: string) => state.nodes.find((n) => n.id === id && !n.data.ghost)
  return { m, state, sync, advance, get, isBusy: () => busy }
}

const base = mindDoc('d1', [topic('r', 0, 0, null)])
const withChild = mindDoc('d1', [topic('r', 0, 0, null), topic('c', 300, 100, 'r')])

describe('CanvasMotion', () => {
  // 提示是模块级状态（自绘提示有 1.5s 有效期），每个用例前清掉，免得串到下一个用例
  beforeEach(() => {
    takeReveal('')
    takeInstant()
  })

  it('不允许动效时原样返回派生结果，不登记任何动画', () => {
    const h = harness(false)
    h.sync(base, 'set')
    const next = h.sync(withChild, 'execute')
    expect(h.state.nodes).toBe(next.nodes)
    expect(h.isBusy()).toBe(false)
  })

  it('打开示例（revealNext）时依次弹出、连线自绘；打开普通文档则不播', () => {
    const h = harness()
    revealNext('d1')
    h.sync(withChild, 'set')
    expect(h.get('r')!.className).toBe('ds-fx-pop')
    expect(h.state.edges[0].className).toBe('ds-fx-draw')
    expect(h.isBusy()).toBe(true)
    h.advance(3000)
    expect(h.get('r')!.className).toBeUndefined()
    expect(h.isBusy()).toBe(false)

    takeReveal('') // 提示有效期内重开同一份文档会再播（StrictMode 需要），这里模拟过期
    const plain = harness()
    plain.sync(withChild, 'set')
    expect(plain.get('r')!.className).toBeUndefined()
  })

  it('加子主题：从父节点中心飞出并长大，补间结束落在文档位置', () => {
    const h = harness()
    h.sync(base, 'set')
    h.sync(withChild, 'execute')
    expect(h.get('c')!.position).toEqual({ x: 0, y: 0 })
    expect(h.get('c')!.className).toBe('ds-fx-enter')
    h.advance(200)
    const mid = h.get('c')!.position
    expect(mid.x).toBeGreaterThan(0)
    expect(mid.x).toBeLessThan(400)
    h.advance(1000)
    expect(h.get('c')!.position).toEqual({ x: 300, y: 100 })
    expect(h.get('c')!.className).toBeUndefined()
  })

  it('布局紧接着改目标时从当前位置接着走，不跳回起点', () => {
    const h = harness()
    h.sync(base, 'set')
    h.sync(withChild, 'execute')
    h.advance(100)
    const before = h.get('c')!.position
    const relaid = mindDoc('d1', [topic('r', 0, 0, null), topic('c', 300, 300, 'r')])
    h.sync(relaid, 'execute')
    expect(h.get('c')!.position).toEqual(before)
    h.advance(1000)
    expect(h.get('c')!.position).toEqual({ x: 300, y: 300 })
  })

  it('删除：留一个收回父节点的残影，到期后移除', () => {
    const h = harness()
    h.sync(withChild, 'set')
    h.sync(base, 'execute')
    const ghost = h.state.nodes.find((n) => n.id === 'c')!
    expect(ghost.data.ghost).toBe(true)
    expect(ghost.className).toContain('ds-fx-ghost')
    expect(ghost.selectable).toBe(false)
    expect(h.state.edges.some((e) => e.data?.ghost)).toBe(true)
    h.advance(1000)
    expect(h.state.nodes.map((n) => n.id)).toEqual(['r'])
    expect(h.state.edges).toEqual([])
  })

  it('撤销后内容变了的节点闪一圈；键盘微移（skipNextMotion）直接到位', () => {
    const h = harness()
    h.sync(withChild, 'set')
    const edited = mindDoc('d1', [topic('r', 0, 0, null, '改过'), topic('c', 300, 100, 'r')])
    h.sync(edited, 'undo')
    expect(h.get('r')!.className).toBe('ds-fx-changed')

    skipNextMotion()
    const nudged = mindDoc('d1', [topic('r', 0, 0, null, '改过'), topic('c', 310, 100, 'r')])
    h.sync(nudged, 'execute')
    expect(h.get('c')!.position).toEqual({ x: 310, y: 100 })
  })

  it('finish：补间跳到终点、类名摘掉、残影移除', () => {
    const h = harness()
    h.sync(base, 'set')
    h.sync(withChild, 'execute')
    expect(h.m.finish()).toBe(true)
    expect(h.get('c')!.position).toEqual({ x: 300, y: 100 })
    expect(h.get('c')!.className).toBeUndefined()
    expect(h.isBusy()).toBe(false)
    expect(h.m.finish()).toBe(false)
  })

  it('卸载后同一文档再挂载按「新打开」处理（StrictMode 模拟重挂载）', () => {
    const h = harness()
    h.sync(withChild, 'set')
    h.m.dispose()
    revealNext('d1')
    h.sync(withChild, 'set')
    expect(h.get('r')!.className).toBe('ds-fx-pop')
  })
})
