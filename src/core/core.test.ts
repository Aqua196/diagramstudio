import { describe, expect, it } from 'vitest'
import { contrastRatio, NODE_COLORS, TEXT_ON } from './palette'
import { validateDoc } from './model/schema'
import { docToJson, jsonToDoc } from './io/serialize'
import { dagreLayout } from './layout/dagre'
import { collapsedDescendants, mindmapLayout } from './layout/mindmap'
import { frameSvg } from './io/titleblock'
import { createDoc, createEdge, createNode } from './model/factories'
import { addEdge, addNode } from './commands/ops'
import { emptyHistory, executeCommand } from './commands/history'

describe('配色对比度（SPEC：每对节点底色与文字色 ≥4.5:1）', () => {
  it('亮色底配亮色文字、暗色底配暗色文字全部达标', () => {
    for (const c of Object.values(NODE_COLORS)) {
      expect(contrastRatio(c.light, TEXT_ON.light)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(c.dark, TEXT_ON.dark)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('zod 校验与序列化', () => {
  it('合法文档往返一致', () => {
    const doc = createDoc('flowchart')
    const back = jsonToDoc(docToJson(doc))
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.doc.id).toBe(doc.id)
  })
  it('非法 JSON 与坏结构给出中文原因', () => {
    const r1 = jsonToDoc('{bad')
    expect(r1.ok).toBe(false)
    if (!r1.ok) expect(r1.errors[0]).toContain('JSON 语法错误')
    const r2 = validateDoc({ schemaVersion: 1, id: 'x' })
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.errors.join()).toContain('nodes')
  })
  it('引用完整性：悬空连线报错', () => {
    const doc = createDoc('flowchart')
    const n = createNode('process', { x: 0, y: 0 })
    doc.nodes[n.id] = n
    doc.zOrder = [n.id]
    const e = createEdge(n.id, 'ghost')
    doc.edges[e.id] = e
    const r = validateDoc(doc)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join()).toContain('ghost')
  })
})

describe('布局', () => {
  it('dagre 为所有节点给出坐标且互不重叠（粗检）', () => {
    let doc = createDoc('flowchart')
    const a = createNode('process', { x: 0, y: 0 })
    const b = createNode('process', { x: 0, y: 0 })
    const e = createEdge(a.id, b.id)
    doc = executeCommand(doc, emptyHistory(), addNode(a)).doc
    doc = executeCommand(doc, emptyHistory(), addNode(b)).doc
    doc = executeCommand(doc, emptyHistory(), addEdge(e)).doc
    const pos = dagreLayout(doc, { direction: 'TB' })
    expect(Object.keys(pos).length).toBe(2)
    expect(pos[a.id].y).not.toBe(pos[b.id].y)
  })

  it('思维导图左右交替布局且折叠子树隐藏', () => {
    let doc = createDoc('mindmap')
    const root = createNode('centerTopic', { x: 0, y: 0 })
    root.data = { parentId: null }
    doc = executeCommand(doc, emptyHistory(), addNode(root)).doc
    const kids = [0, 1, 2, 3].map((i) => {
      const n = createNode('topic', { x: 0, y: 0 })
      n.data = { parentId: root.id, ...(i === 0 ? { collapsed: true } : {}) }
      n.text = `k${i}`
      return n
    })
    for (const k of kids) doc = executeCommand(doc, emptyHistory(), addNode(k)).doc
    const grand = createNode('topic', { x: 0, y: 0 })
    grand.data = { parentId: kids[0].id }
    doc = executeCommand(doc, emptyHistory(), addNode(grand)).doc

    const pos = mindmapLayout(doc, { direction: 'LR' })
    expect(pos[kids[0].id].x).toBeGreaterThan(0)
    expect(pos[kids[1].id].x).toBeLessThan(0)
    expect(pos[grand.id]).toBeUndefined() // 折叠的子树不布局
    expect(collapsedDescendants(doc).has(grand.id)).toBe(true)
  })
})

describe('图框与标题栏', () => {
  it('包含标题/作者/日期/版本与外��', () => {
    const svg = frameSvg({
      width: 800,
      height: 600,
      margin: 40,
      info: { title: '登录流程', author: '张三', date: '2026-10-10', version: 'v1' },
      colors: { line: '#ddd', ink: '#111', ink3: '#666', panel: '#fff' },
    })
    for (const s of ['登录流程', '张三', '2026-10-10', 'v1', '图名', '作者', '日期', '版本']) {
      expect(svg).toContain(s)
    }
  })
})
