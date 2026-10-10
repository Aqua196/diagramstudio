import { describe, expect, it } from 'vitest'
import {
  addEdge,
  addNode,
  alignPositions,
  alignNodes,
  distributeNodes,
  patchEdge,
  patchNode,
  patchNodeStyle,
  reconnectEdge,
  resizeNode,
  setDocTitle,
  setSettings,
} from './ops'
import { emptyHistory, executeCommand } from './history'
import { createDoc, createEdge, createNode } from '../model/factories'

function setup() {
  let doc = createDoc('flowchart')
  const a = createNode('process', { x: 0, y: 0 }, { w: 100, h: 50 })
  const b = createNode('process', { x: 300, y: 100 }, { w: 100, h: 50 })
  const c = createNode('process', { x: 200, y: 300 }, { w: 100, h: 50 })
  for (const n of [a, b, c]) doc = executeCommand(doc, emptyHistory(), addNode(n)).doc
  const e = createEdge(a.id, b.id)
  doc = executeCommand(doc, emptyHistory(), addEdge(e)).doc
  return { doc, a, b, c, e }
}

describe('ops 其余命令', () => {
  it('resizeNode 约束最小尺寸并撤销', () => {
    const { doc, a } = setup()
    const r = executeCommand(doc, emptyHistory(), resizeNode(a.id, { x: 10, y: 10 }, { w: 5, h: 5 }))
    expect(r.doc.nodes[a.id].size).toEqual({ w: 5, h: 5 }) // 最小尺寸约束在 UI 拖拽层，不在命令
    expect(r.doc.nodes[a.id].position).toEqual({ x: 10, y: 10 })
    const u = executeCommand(r.doc, r.history, resizeNode(a.id, { x: 0, y: 0 }, { w: 200, h: 120 }))
    expect(u.doc.nodes[a.id].size).toEqual({ w: 200, h: 120 })
  })

  it('patchNode/patchNodeStyle/patchEdge 修改并保留其他字段', () => {
    const { doc, a, e } = setup()
    const r1 = executeCommand(doc, emptyHistory(), patchNode(a.id, { text: '新文本' }))
    expect(r1.doc.nodes[a.id].text).toBe('新文本')
    const r2 = executeCommand(r1.doc, r1.history, patchNodeStyle(a.id, { fill: 'blue', fontSize: 16 }))
    expect(r2.doc.nodes[a.id].style.fill).toBe('blue')
    expect(r2.doc.nodes[a.id].style.fontSize).toBe(16)
    const r3 = executeCommand(r2.doc, r2.history, patchEdge(e.id, { label: '去', routing: 'step' }))
    expect(r3.doc.edges[e.id].label).toBe('去')
    expect(r3.doc.edges[e.id].routing).toBe('step')
  })

  it('reconnectEdge 换端点并记录原端点', () => {
    const { doc, a, c, e } = setup()
    const r = executeCommand(doc, emptyHistory(), reconnectEdge(e.id, { source: c.id }))
    expect(r.doc.edges[e.id].source).toBe(c.id)
    expect(r.doc.edges[e.id].target).toBe(e.target)
    void a
  })

  it('alignNodes 生成可撤销的移动命令；distributeNodes 竖向分布', () => {
    const { doc, a, b, c } = setup()
    const r = executeCommand(doc, emptyHistory(), alignNodes(doc, [a.id, b.id, c.id], 'top'))
    for (const id of [a.id, b.id, c.id]) expect(r.doc.nodes[id].position.y).toBe(0)
    const r2 = executeCommand(doc, emptyHistory(), distributeNodes(doc, [a.id, b.id, c.id], 'v'))
    expect(r2.doc.nodes[b.id].position.y).toBe(150) // gap=(350-150)/2=100 → a.y+a.h+gap
    expect(r2.doc.nodes[c.id].position.y).toBe(300) // 尾部不动
  })

  it('setDocTitle / setSettings', () => {
    const { doc } = setup()
    const r = executeCommand(doc, emptyHistory(), setDocTitle('登录流程'))
    expect(r.doc.title).toBe('登录流程')
    const r2 = executeCommand(r.doc, r.history, setSettings({ snap: false, layoutDirection: 'LR' }))
    expect(r2.doc.settings.snap).toBe(false)
    expect(r2.doc.settings.layoutDirection).toBe('LR')
  })

  it('alignPositions 其余方向', () => {
    const { doc, a, b, c } = setup()
    const ids = [a.id, b.id, c.id]
    expect(alignPositions(doc, ids, 'right')[a.id].x).toBe(300) // 右缘 400 - w100
    expect(alignPositions(doc, ids, 'middle')[a.id].y).toBe(150) // 包围盒 y∈[0,350] 中 175 - h/2
    expect(alignPositions(doc, ids, 'bottom')[a.id].y).toBe(300)
    expect(alignPositions(doc, ids, 'left')[b.id].x).toBe(0)
  })
})
