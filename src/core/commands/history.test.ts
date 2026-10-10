import { describe, expect, it } from 'vitest'
import { addNode, moveNodesBy, updateNodeText } from './ops'
import {
  emptyHistory,
  executeCommand,
  HISTORY_LIMIT,
  redoCommand,
  redoLabel,
  undoCommand,
  undoLabel,
} from './history'
import { createDoc, createNode } from '../model/factories'

function docWithNode() {
  const doc = createDoc('flowchart')
  const n = createNode('process', { x: 0, y: 0 })
  const r = executeCommand(doc, emptyHistory(), addNode(n))
  return { doc: r.doc, history: r.history, n }
}

describe('命令历史', () => {
  it('execute 入栈并可撤销/重做', () => {
    const { doc, history, n } = docWithNode()
    const moved = executeCommand(doc, history, moveNodesBy([n.id], 10, 20))
    expect(moved.doc.nodes[n.id].position).toEqual({ x: 10, y: 20 })

    const undone = undoCommand(moved.doc, moved.history)
    expect(undone.doc.nodes[n.id].position).toEqual({ x: 0, y: 0 })
    expect(undoLabel(undone.history)).toBe('添加节点')
    expect(redoLabel(undone.history)).toBe('移动元素')

    const redone = redoCommand(undone.doc, undone.history)
    expect(redone.doc.nodes[n.id].position).toEqual({ x: 10, y: 20 })
  })

  it('相同 coalesceKey 且 <600ms 合并为一条', () => {
    const { doc, history, n } = docWithNode()
    let r = executeCommand(doc, history, updateNodeText(n.id, '你'), 1000)
    r = executeCommand(r.doc, r.history, updateNodeText(n.id, '你好'), 1300)
    r = executeCommand(r.doc, r.history, updateNodeText(n.id, '你好世界'), 2000) // 超窗 → 新条目
    expect(r.history.past.length).toBe(3) // addNode + 合并条 + 新条
    const u1 = undoCommand(r.doc, r.history)
    expect(u1.doc.nodes[n.id].text).toBe('你好')
    const u2 = undoCommand(u1.doc, u1.history)
    expect(u2.doc.nodes[n.id].text).toBe('')
  })

  it('历史上限 200 条，超出丢弃最旧', () => {
    const { doc, history, n } = docWithNode()
    let h = history
    let d = doc
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      const r = executeCommand(d, h, moveNodesBy([n.id], 1, 0), i * 1000)
      d = r.doc
      h = r.history
    }
    expect(h.past.length).toBe(HISTORY_LIMIT)
  })

  it('无实质改动的命令不入栈', () => {
    const { doc, history } = docWithNode()
    const r = executeCommand(doc, history, moveNodesBy(['ghost'], 1, 1))
    expect(r.history.past.length).toBe(1)
    expect(r.doc).toBe(doc)
  })

  it('空栈 undo/redo 是安全的', () => {
    const { doc, history } = docWithNode()
    const r = undoCommand(doc, emptyHistory())
    expect(r.doc).toBe(doc)
    const r2 = redoCommand(doc, history)
    expect(r2.doc).toBe(doc)
  })
})
