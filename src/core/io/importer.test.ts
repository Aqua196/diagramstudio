// 导入器：JSON 走 schema 校验；Mermaid 解析后过布局器（SPEC §5）。
import { describe, expect, it } from 'vitest'
import { docToJson } from './serialize'
import { createDoc, createNode } from '../model/factories'
import { importJsonText, importMermaidText } from './importer'

describe('importJsonText', () => {
  it('合法 JSON 往返成功，并换新 id（导入总是新建一份）', () => {
    const doc = createDoc('flowchart', 'T')
    const n = createNode('process', { x: 5, y: 5 })
    doc.nodes[n.id] = n
    doc.zOrder = [n.id]
    const r = importJsonText(docToJson(doc))
    expect(r.ok).toBe(true)
    expect(r.doc!.title).toBe('T')
    expect(r.doc!.id).not.toBe(doc.id)
    expect(r.errors).toEqual([])
  })

  it('非法 JSON 与非法 schema 都返回 errors', () => {
    expect(importJsonText('not json').ok).toBe(false)
    expect(importJsonText('{"foo":1}').ok).toBe(false)
    expect(importJsonText('not json').errors.length).toBeGreaterThan(0)
  })
})

describe('importMermaidText', () => {
  it('graph TD 建节点与边，未知行计入 skipped', () => {
    const r = importMermaidText('graph TD\n  A[开始] --> B[结束]\n  nonsense line here\n')
    expect(r.ok).toBe(true)
    expect(Object.keys(r.doc!.nodes).length).toBe(2)
    expect(Object.keys(r.doc!.edges).length).toBe(1)
    expect(r.skipped).toBe(1)
    expect(r.doc!.type).toBe('flowchart')
    // 节点摆位非原点（过了布局器）
    const pos = Object.values(r.doc!.nodes).map((n) => n.position)
    expect(pos.every((p) => p.x === 0 && p.y === 0)).toBe(false)
  })

  it('graph LR 设置布局方向', () => {
    const r = importMermaidText('graph LR\n  A --> B\n')
    expect(r.ok).toBe(true)
    expect(r.doc!.settings.layoutDirection).toBe('LR')
  })

  it('无可识别内容返回错误与 skipped', () => {
    const r = importMermaidText('graph TD\n', { emptyError: '空的' })
    expect(r.ok).toBe(false)
    expect(r.errors).toEqual(['空的'])
    const r2 = importMermaidText('graph TD\n  ???\n')
    expect(r2.ok).toBe(false)
    expect(r2.errors[0]).toContain('mermaid')
  })

  it('注入的自定义布局器生效', () => {
    const r = importMermaidText('graph TD\n  A --> B\n', {
      layout: (d) => Object.fromEntries(Object.keys(d.nodes).map((id) => [id, { x: 1, y: 2 }])),
    })
    expect(Object.values(r.doc!.nodes).every((n) => n.position.x === 1 && n.position.y === 2)).toBe(
      true,
    )
  })

  it('注入的连线路由覆盖默认曲线；不注入保持原样', () => {
    const step = importMermaidText('graph TD\n  A --> B\n', { edgeRouting: 'step' })
    expect(Object.values(step.doc!.edges).every((e) => e.routing === 'step')).toBe(true)
    const plain = importMermaidText('graph TD\n  A --> B\n')
    expect(Object.values(plain.doc!.edges)[0].routing).toBe('bezier')
  })

  it('边端点在导入后仍然有效（schema 可过）', () => {
    const r = importMermaidText('graph TD\n  A --> B\n  A --> C\n')
    const doc = r.doc!
    for (const e of Object.values(doc.edges)) {
      expect(doc.nodes[e.source]).toBeDefined()
      expect(doc.nodes[e.target]).toBeDefined()
    }
    const again = importJsonText(docToJson(doc))
    expect(again.ok).toBe(true)
  })
})
