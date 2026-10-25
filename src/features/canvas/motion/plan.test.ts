// 动效规划（纯函数）：谁滑动、谁从哪里长出、谁收回到哪里；打开文档时的自绘次序。
import { describe, expect, it } from 'vitest'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import { cascadeOrder, enterSource, planMotion, type ViewNode } from './plan'
import { cascadeFx } from './cascade'

function node(id: string, x: number, y: number, parentId?: string): DiagramNode {
  const n = createNode('topic', { x, y }, { w: 100, h: 40 }, id)
  n.id = id
  if (parentId !== undefined) n.data = { parentId }
  return n
}

function doc(nodes: DiagramNode[], edges: Array<[string, string, string]> = []): DiagramDoc {
  const d = createDoc('mindmap')
  for (const n of nodes) d.nodes[n.id] = n
  d.zOrder = nodes.map((n) => n.id)
  for (const [id, s, t] of edges) {
    const e = createEdge(s, t)
    e.id = id
    d.edges[id] = e
  }
  return d
}

const view = (d: DiagramDoc, ids = Object.keys(d.nodes)): ViewNode[] =>
  ids.map((id) => ({ id, position: { ...d.nodes[id].position }, width: 100, height: 40 }))

describe('planMotion', () => {
  it('位置变了的节点补间，从画面位置到文档位置；没动的不出现在计划里', () => {
    const a = doc([node('r', 0, 0), node('c', 200, 0, 'r')])
    const b = doc([node('r', 0, 0), node('c', 200, 80, 'r')])
    const plan = planMotion(view(a), view(b), a, b)
    expect(plan.moves).toEqual([{ id: 'c', from: { x: 200, y: 0 }, to: { x: 200, y: 80 } }])
    expect(plan.enters).toEqual([])
    expect(plan.exits).toEqual([])
  })

  it('小于 minMove 的位移与正在拖动的节点都不补间', () => {
    const a = doc([node('r', 0, 0), node('c', 200, 0)])
    const b = doc([node('r', 1, 0), node('c', 260, 0)])
    const plan = planMotion(view(a), view(b), a, b, { minMove: 2, dragging: new Set(['c']) })
    expect(plan.moves).toEqual([])
  })

  it('新子主题从父节点中心长出（中心对齐换算成左上角）', () => {
    const a = doc([node('r', 0, 0)])
    const b = doc([node('r', 0, 0), node('c', 200, 0, 'r')])
    const plan = planMotion(view(a), view(b), a, b)
    expect(plan.enters).toEqual([{ id: 'c', origin: { x: 0, y: 0 } }])
  })

  it('展开多层子树：孙节点沿父链找到最近的已显示祖先，一起从被点的节点散开', () => {
    const a = doc([node('r', 0, 0)])
    const b = doc([node('r', 0, 0), node('c', 200, 0, 'r'), node('g', 400, 0, 'c')])
    const plan = planMotion(view(a), view(b), a, b)
    expect(plan.enters.map((e) => e.origin)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ])
  })

  it('流程图「+」：新节点从新连线另一端飞出；撤销删除等（edgeSources=false）则原地出现', () => {
    const a = doc([node('s', 0, 0)])
    const b = doc([node('s', 0, 0), node('t', 0, 200)], [['e1', 's', 't']])
    expect(planMotion(view(a), view(b), a, b).enters[0].origin).toEqual({ x: 0, y: 0 })
    expect(planMotion(view(a), view(b), a, b, { edgeSources: false }).enters[0].origin).toBeNull()
  })

  it('折叠：被隐藏的子节点收向仍可见的父节点；没有父子关系的删除原地淡出', () => {
    const full = doc([node('r', 0, 0), node('c', 200, 0, 'r'), node('x', 0, 300)])
    const next = doc([node('r', 0, 0), node('c', 200, 0, 'r')])
    const plan = planMotion(view(full), view(next, ['r']), full, next)
    expect(plan.exits).toEqual([
      { id: 'c', toward: { x: 0, y: 0 } },
      { id: 'x', toward: null },
    ])
  })

  it('撤销「加子主题」：新文档里已没有它，按旧文档的父链收回父节点', () => {
    const a = doc([node('r', 0, 0), node('c', 200, 0, 'r')])
    const b = doc([node('r', 0, 0)])
    expect(planMotion(view(a), view(b), a, b).exits).toEqual([{ id: 'c', toward: { x: 0, y: 0 } }])
  })

  it('父链成环不死循环', () => {
    const d = doc([node('a', 0, 0, 'b'), node('b', 0, 0, 'a')])
    expect(enterSource('a', () => false, d, d, false)).toBeNull()
  })
})

describe('cascadeOrder / cascadeFx', () => {
  it('从根广度优先，每个可见节点恰好一次', () => {
    const d = doc([
      node('c2', 0, 0, 'r'),
      node('r', 0, 0),
      node('c1', 0, 0, 'r'),
      node('g', 0, 0, 'c1'),
    ])
    const order = cascadeOrder(d, ['c2', 'r', 'c1', 'g'])
    expect(order[0]).toBe('r')
    expect(order.indexOf('g')).toBeGreaterThan(order.indexOf('c1'))
    expect([...order].sort()).toEqual(['c1', 'c2', 'g', 'r'])
  })

  it('流程图回边形成的环也能排完', () => {
    const d = doc(
      [node('a', 0, 0), node('b', 0, 0), node('c', 0, 0)],
      [
        ['e1', 'a', 'b'],
        ['e2', 'b', 'c'],
        ['e3', 'c', 'b'],
      ],
    )
    expect(cascadeOrder(d, ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    const ring = doc(
      [node('a', 0, 0), node('b', 0, 0)],
      [
        ['e1', 'a', 'b'],
        ['e2', 'b', 'a'],
      ],
    )
    expect(cascadeOrder(ring, ['a', 'b']).sort()).toEqual(['a', 'b'])
  })

  it('延迟按次序递增、总时长有上限；连线在起点出现之后才开画', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `n${i}`)
    const d = doc(ids.map((id, i) => node(id, 0, 0, i ? 'n0' : undefined)))
    const edges = ids.slice(1).map((id) => ({ id: `e-${id}`, source: 'n0', target: id }))
    const fx = cascadeFx(d, ids, edges, 120)
    const delays = cascadeOrder(d, ids).map((id) =>
      parseInt(String(fx.nodes.get(id)!.style!['--ds-delay' as never])),
    )
    expect(delays).toEqual([...delays].sort((a, b) => a - b))
    expect(Math.max(...[...fx.nodes.values()].map((f) => f.dur))).toBeLessThanOrEqual(
      120 + 700 + 300,
    )
    for (const e of fx.edges.values()) {
      expect(parseInt(String(e.style!['--ds-delay' as never]))).toBeGreaterThanOrEqual(delays[0])
      expect(e.cls).toBe('ds-fx-draw')
    }
  })
})
