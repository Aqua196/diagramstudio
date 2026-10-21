// 文档 → React Flow 元素：没变的节点沿用上一帧对象，变了的保留实测尺寸（否则 React Flow 会清空锚点、连线闪一帧）。
import { describe, expect, it } from 'vitest'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import { getPlugin } from '@/plugins/registry'
import { deriveEdges, deriveNodes } from './derive'

const plugin = getPlugin('flowchart')
const NO_SEL = { nodeIds: [], edgeIds: [] }

function twoNodes() {
  const doc = createDoc('flowchart')
  const a = createNode('process', { x: 0, y: 0 }, { w: 120, h: 48 }, 'A')
  const b = createNode('process', { x: 0, y: 120 }, { w: 120, h: 48 }, 'B')
  const e = createEdge(a.id, b.id)
  doc.nodes = { [a.id]: a, [b.id]: b }
  doc.zOrder = [a.id, b.id]
  doc.edges = { [e.id]: e }
  return { doc, a, b, e }
}

describe('deriveNodes / deriveEdges', () => {
  it('内容与位置都没变的节点、连线沿用上一帧的对象', () => {
    const { doc } = twoNodes()
    const nodes = deriveNodes(doc, plugin, [], NO_SEL).map((n) => ({ ...n, measured: { width: 120, height: 48 } }))
    const edges = deriveEdges(doc, plugin, [], NO_SEL)
    const again = deriveNodes(doc, plugin, nodes, NO_SEL)
    expect(again[0]).toBe(nodes[0])
    expect(deriveEdges(doc, plugin, edges, NO_SEL)[0]).toBe(edges[0])
  })

  it('改了的节点换新对象但保留 measured；尺寸变了则不保留', () => {
    const { doc, a, b } = twoNodes()
    const nodes = deriveNodes(doc, plugin, [], NO_SEL).map((n) => ({ ...n, measured: { width: 120, height: 48 } }))
    const moved = { ...doc, nodes: { ...doc.nodes, [a.id]: { ...a, position: { x: 40, y: 0 } } } }
    const out = deriveNodes(moved, plugin, nodes, NO_SEL)
    expect(out[0]).not.toBe(nodes[0])
    expect(out[0].measured).toEqual({ width: 120, height: 48 })
    const resized = { ...doc, nodes: { ...doc.nodes, [b.id]: { ...b, size: { w: 200, h: 48 } } } }
    expect(deriveNodes(resized, plugin, nodes, NO_SEL)[1].measured).toBeUndefined()
  })

  it('选中状态按选择集还原，变化时换新对象', () => {
    const { doc, a, e } = twoNodes()
    const nodes = deriveNodes(doc, plugin, [], NO_SEL)
    const sel = { nodeIds: [a.id], edgeIds: [e.id] }
    const out = deriveNodes(doc, plugin, nodes, sel)
    expect(out[0].selected).toBe(true)
    expect(out[0]).not.toBe(nodes[0])
    expect(deriveEdges(doc, plugin, [], sel)[0].selected).toBe(true)
  })
})
