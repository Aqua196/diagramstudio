import { describe, expect, it } from 'vitest'
import { computeDocDiff } from './diff'
import { createDoc, createEdge, createNode } from '../model/factories'

describe('协作文档 diff', () => {
  it('首次写入：全部 set，meta 变更', () => {
    const doc = createDoc('flowchart')
    const n = createNode('process', { x: 1, y: 2 })
    doc.nodes[n.id] = n
    doc.zOrder = [n.id]
    const d = computeDocDiff(doc, null)
    expect(d.setNodes.length).toBe(1)
    expect(d.delNodes.length).toBe(0)
    expect(d.metaChanged).toBe(true)
  })

  it('只改动的 key 进入 set，消失的进入 del', () => {
    const doc = createDoc('flowchart')
    const a = createNode('a', { x: 0, y: 0 })
    const b = createNode('b', { x: 1, y: 1 })
    const e = createEdge(a.id, b.id)
    doc.nodes = { [a.id]: a, [b.id]: b }
    doc.edges = { [e.id]: e }

    const next = { ...doc, nodes: { ...doc.nodes }, edges: {} }
    next.nodes[a.id] = { ...a, text: '改' } // a 变、b 不变
    const d = computeDocDiff(next, doc)
    expect(d.setNodes.map(([id]) => id)).toEqual([a.id])
    expect(d.delEdges).toEqual([e.id])
    expect(d.metaChanged).toBe(false)
  })

  it('标题/zOrder/settings 变化算 metaChanged', () => {
    const doc = createDoc('flowchart')
    expect(computeDocDiff({ ...doc, title: 't' }, doc).metaChanged).toBe(true)
    expect(computeDocDiff({ ...doc, zOrder: ['x'] }, doc).metaChanged).toBe(true)
    expect(computeDocDiff(doc, doc).metaChanged).toBe(false)
  })
})
