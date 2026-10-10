import { describe, expect, it } from 'vitest'
import {
  addEdge,
  addNode,
  alignPositions,
  bringToFront,
  cloneForPaste,
  deleteElements,
  distributePositions,
  insertElements,
  sendToBack,
} from './ops'
import { executeCommand, emptyHistory } from './history'
import { createDoc, createEdge, createNode } from '../model/factories'
import type { DiagramDoc } from '../model/types'

function makeDoc(): { doc: DiagramDoc; ids: string[] } {
  const doc = createDoc('flowchart')
  const ids: string[] = []
  let d = doc
  let h = emptyHistory()
  for (let i = 0; i < 3; i++) {
    const n = createNode('process', { x: i * 100, y: i * 50 }, { w: 100, h: 50 })
    const r = executeCommand(d, h, addNode(n))
    d = r.doc
    h = r.history
    ids.push(n.id)
  }
  return { doc: d, ids }
}

describe('元素操作命令', () => {
  it('删除节点连带删除依附连线', () => {
    const { doc, ids } = makeDoc()
    const e = createEdge(ids[0], ids[1])
    const r1 = executeCommand(doc, emptyHistory(), addEdge(e))
    const r2 = executeCommand(r1.doc, r1.history, deleteElements([ids[0]], []))
    expect(r2.doc.nodes[ids[0]]).toBeUndefined()
    expect(r2.doc.edges[e.id]).toBeUndefined()
    expect(r2.doc.zOrder).not.toContain(ids[0])
  })

  it('粘贴克隆保留内部连线、换新 id、偏移', () => {
    const { doc, ids } = makeDoc()
    const e = createEdge(ids[0], ids[1])
    const e2 = createEdge(ids[0], 'outside')
    const d1 = executeCommand(doc, emptyHistory(), addEdge(e)).doc
    const d2 = executeCommand(d1, emptyHistory(), addEdge(e2)).doc
    const { nodes, edges } = cloneForPaste(d2, [ids[0], ids[1]], { x: 24, y: 24 })
    expect(nodes.length).toBe(2)
    expect(edges.length).toBe(1) // 外部连线不复制
    expect(nodes[0].id).not.toBe(ids[0])
    expect(nodes[0].position.x).toBe(doc.nodes[ids[0]].position.x + 24)
    expect(edges[0].source).toBe(nodes[0].id)
    const r = executeCommand(d2, emptyHistory(), insertElements(nodes, edges))
    expect(Object.keys(r.doc.nodes).length).toBe(5)
  })

  it('叠放顺序：置顶/置底', () => {
    const { doc, ids } = makeDoc()
    const r1 = executeCommand(doc, emptyHistory(), bringToFront([ids[0]]))
    expect(r1.doc.zOrder[r1.doc.zOrder.length - 1]).toBe(ids[0])
    const r2 = executeCommand(r1.doc, r1.history, sendToBack([ids[0]]))
    expect(r2.doc.zOrder[0]).toBe(ids[0])
  })
})

describe('对齐与分布（纯函数）', () => {
  it('左对齐取最小 x', () => {
    const { doc, ids } = makeDoc()
    const p = alignPositions(doc, ids, 'left')
    for (const id of ids) expect(p[id].x).toBe(0)
  })
  it('水平居中到包围盒中轴', () => {
    const { doc, ids } = makeDoc()
    const p = alignPositions(doc, ids, 'center')
    expect(p[ids[1]].x).toBe(100) // 包围盒 [0,300] 宽300，节点宽100 → 居中 100
  })
  it('横向等距分布首尾不动', () => {
    const doc = createDoc('flowchart')
    const a = createNode('process', { x: 0, y: 0 }, { w: 100, h: 50 })
    const b = createNode('process', { x: 500, y: 0 }, { w: 100, h: 50 })
    const c = createNode('process', { x: 200, y: 0 }, { w: 100, h: 50 })
    let d = doc
    for (const n of [a, b, c]) d = executeCommand(d, emptyHistory(), addNode(n)).doc
    const p = distributePositions(d, [a.id, b.id, c.id], 'h')
    expect(p[a.id]).toBeUndefined() // 首尾不动
    expect(p[b.id]).toBeUndefined()
    expect(p[c.id].x).toBe(250) // gap=(600-300)/2=150 → a.x+a.w+gap=250
  })
})
