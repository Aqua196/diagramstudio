// zOrder 完整性检查（A5）：重复 id、缺失节点、悬空连线都要给出中文错误。
import { describe, expect, it } from 'vitest'
import { createDoc, createEdge, createNode } from './factories'
import { validateDoc } from './schema'

function setup() {
  const doc = createDoc('flowchart')
  const a = createNode('process', { x: 0, y: 0 })
  const b = createNode('process', { x: 200, y: 0 })
  doc.nodes[a.id] = a
  doc.nodes[b.id] = b
  doc.zOrder = [a.id, b.id]
  const e = createEdge(a.id, b.id)
  doc.edges[e.id] = e
  return { doc, a, b, e }
}

describe('validateDoc / semanticCheck', () => {
  it('合法文档通过', () => {
    const { doc } = setup()
    const r = validateDoc(doc)
    expect(r.ok).toBe(true)
  })

  it('zOrder 中重复节点 id 报错', () => {
    const { doc, a } = setup()
    doc.zOrder = [a.id, a.id]
    const r = validateDoc(doc)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('重复'))).toBe(true)
  })

  it('zOrder 引用不存在的节点报错', () => {
    const { doc } = setup()
    doc.zOrder.push('ghost')
    const r = validateDoc(doc)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('不存在'))).toBe(true)
  })

  it('节点缺失于 zOrder 报错', () => {
    const { doc, b } = setup()
    doc.zOrder = doc.zOrder.filter((id) => id !== b.id)
    const r = validateDoc(doc)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('缺失于叠放顺序'))).toBe(true)
  })

  it('连线端点不存在报错', () => {
    const { doc, e } = setup()
    doc.edges[e.id] = { ...e, target: 'ghost' }
    const r = validateDoc(doc)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e2) => e2.includes('终点'))).toBe(true)
  })
})
