import { describe, expect, it } from 'vitest'
import { pickEdgeSides, selectFlowEdges } from './selectors'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import { flowchartPlugin } from '@/plugins/flowchart'

const box = (x: number, y: number, w = 100, h = 60) => ({ x, y, w, h })

describe('pickEdgeSides：未指定锚点时按节点中心连线选边', () => {
  it('水平占优：目标在右 → source right / target left', () => {
    expect(pickEdgeSides(box(0, 0), box(300, 20))).toEqual({ source: 'right', target: 'left' })
    expect(pickEdgeSides(box(300, 20), box(0, 0))).toEqual({ source: 'left', target: 'right' })
  })
  it('垂直占优：目标在下 → source bottom / target top', () => {
    expect(pickEdgeSides(box(0, 0), box(10, 400))).toEqual({ source: 'bottom', target: 'top' })
    expect(pickEdgeSides(box(10, 400), box(0, 0))).toEqual({ source: 'top', target: 'bottom' })
  })
  it('完全重叠（dx=dy=0）按水平规则取右/左', () => {
    expect(pickEdgeSides(box(0, 0), box(0, 0))).toEqual({ source: 'right', target: 'left' })
  })
})

describe('selectFlowEdges：缺省锚点自动选边，显式锚点不覆盖', () => {
  it('无 handle 的边按中心选边；有 handle 的边保持原值', () => {
    const doc = createDoc('flowchart', 't')
    const a = createNode('process', { x: 0, y: 0 }, { w: 100, h: 60 }, 'a')
    const b = createNode('process', { x: 300, y: 0 }, { w: 100, h: 60 }, 'b')
    const c = createNode('process', { x: 0, y: 300 }, { w: 100, h: 60 }, 'c')
    for (const n of [a, b, c]) {
      doc.nodes[n.id] = n
      doc.zOrder.push(n.id)
    }
    const e1 = createEdge(a.id, b.id)
    const e2 = createEdge(a.id, c.id)
    e2.sourceHandle = 'right'
    e2.targetHandle = 'left'
    doc.edges[e1.id] = e1
    doc.edges[e2.id] = e2
    const out = selectFlowEdges(doc, flowchartPlugin)
    const f1 = out.find((e) => e.id === e1.id)!
    expect(f1.sourceHandle).toBe('right')
    expect(f1.targetHandle).toBe('left')
    const f2 = out.find((e) => e.id === e2.id)!
    expect(f2.sourceHandle).toBe('right')
    expect(f2.targetHandle).toBe('left')
  })
})
