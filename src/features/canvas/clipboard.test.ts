// 剪贴板：复制只带内部连线，粘贴生成新 id 且端点重映射、偏移 24px。
import { describe, expect, it, beforeEach } from 'vitest'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import {
  buildDuplicate,
  buildPaste,
  copySelection,
  hasClipboard,
  _resetClipboardForTests,
  PASTE_OFFSET,
} from './clipboard'

function setup() {
  const doc = createDoc('flowchart')
  const a = createNode('process', { x: 0, y: 0 })
  const b = createNode('process', { x: 100, y: 0 })
  const c = createNode('process', { x: 300, y: 300 })
  doc.nodes[a.id] = a
  doc.nodes[b.id] = b
  doc.nodes[c.id] = c
  doc.zOrder = [a.id, b.id, c.id]
  const e1 = createEdge(a.id, b.id) // 内部
  const e2 = createEdge(b.id, c.id) // 跨边界
  doc.edges[e1.id] = e1
  doc.edges[e2.id] = e2
  return { doc, a, b, c, e1, e2 }
}

beforeEach(() => _resetClipboardForTests())

describe('copySelection/buildPaste', () => {
  it('复制只保留两端都在选区内的连线', () => {
    const { doc, a, b } = setup()
    copySelection(doc, [a.id, b.id])
    const payload = buildPaste(doc)!
    expect(payload.nodes).toHaveLength(2)
    // e2 一端在选区外 → 不进入剪贴板
    expect(payload.edges).toHaveLength(1)
    expect(payload.edges[0].source).not.toBe(a.id)
  })

  it('粘贴生成新 id、内部连线端点重映射、整体偏移 24px', () => {
    const { doc, a, b } = setup()
    copySelection(doc, [a.id, b.id])
    const payload = buildPaste(doc)!
    const newIds = new Set(payload.nodes.map((n) => n.id))
    for (const n of payload.nodes) {
      expect(n.id).not.toBe(a.id)
      expect(n.id).not.toBe(b.id)
    }
    const e = payload.edges[0]
    expect(newIds.has(e.source)).toBe(true)
    expect(newIds.has(e.target)).toBe(true)
    const minX = Math.min(...payload.nodes.map((n) => n.position.x))
    expect(minX).toBe(PASTE_OFFSET)
  })

  it('连续粘贴偏移逐次递增，避免完全重叠', () => {
    const { doc, a } = setup()
    copySelection(doc, [a.id])
    const p1 = buildPaste(doc)!
    const p2 = buildPaste(doc)!
    expect(p2.nodes[0].position.x).toBe(p1.nodes[0].position.x + PASTE_OFFSET)
  })

  it('未复制时 buildPaste 返回 null', () => {
    const { doc } = setup()
    expect(buildPaste(doc)).toBeNull()
    expect(hasClipboard()).toBe(false)
  })
})

describe('buildDuplicate', () => {
  it('副本走 cloneForPaste：偏移 24px、保留 id 映射', () => {
    const { doc, a, b } = setup()
    const d = buildDuplicate(doc, [a.id, b.id])!
    expect(d).not.toBeNull()
    expect(d.nodes).toHaveLength(2)
    expect(d.nodes[0].position.x).toBe(a.position.x + 24)
  })
})
