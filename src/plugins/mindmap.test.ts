// 思维导图：expandDeletion 子树删除（B2）、分支配色（B3）、
// Tab 加子 + 自动布局合并撤销（B1，经 documentStore + mergeWithPrevious 模拟）。
import { describe, expect, it } from 'vitest'
import { executeCommand, undoCommand, redoCommand, emptyHistory } from '@/core/commands/history'
import { setNodePositions } from '@/core/commands/ops'
import { mindmapLayout } from '@/core/layout/mindmap'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'
import {
  BRANCH_COLORS,
  colorForNewChild,
  expandMindmapDeletion,
  mindData,
  mkChild,
  reparentCommand,
} from './mindmapTree'

function makeTree(): { doc: DiagramDoc; root: string; kids: string[] } {
  const doc = createDoc('mindmap')
  const root = createNode('centerTopic', { x: 0, y: 0 }, { w: 180, h: 60 }, '中心')
  root.data = { parentId: null }
  doc.nodes[root.id] = root
  doc.zOrder = [root.id]
  const kids: string[] = []
  for (let i = 0; i < 2; i++) {
    const k = createNode('topic', { x: 0, y: 0 }, { w: 140, h: 40 }, `分支${i}`)
    k.data = { parentId: root.id }
    doc.nodes[k.id] = k
    doc.zOrder.push(k.id)
    kids.push(k.id)
  }
  const leaf = createNode('topic', { x: 0, y: 0 }, { w: 140, h: 40 }, '叶子')
  leaf.data = { parentId: kids[0] }
  doc.nodes[leaf.id] = leaf
  doc.zOrder.push(leaf.id)
  return { doc, root: root.id, kids: [...kids, leaf.id] }
}

describe('expandDeletion（B2）', () => {
  it('选中分支节点 → 返回该节点及全部后代', () => {
    const { doc, kids } = makeTree()
    const ids = expandMindmapDeletion(doc, [kids[0]])
    expect(ids.sort()).toEqual([kids[0], kids[2]].sort())
  })

  it('中心主题不可删：被过滤掉', () => {
    const { doc, root } = makeTree()
    expect(expandMindmapDeletion(doc, [root])).toEqual([])
  })

  it('多选时只保留所选内的子树，根仍被过滤', () => {
    const { doc, root, kids } = makeTree()
    const ids = expandMindmapDeletion(doc, [root, kids[1]])
    expect(ids).toEqual([kids[1]])
  })
})

describe('分支配色（B3）', () => {
  it('一级分支按 BRANCH_COLORS 轮换', () => {
    const { doc, root } = makeTree()
    expect(colorForNewChild(doc, root)).toBe(BRANCH_COLORS[2]) // 已有 2 个一级子
  })

  it('深层子节点继承父节点 fill', () => {
    const { doc, kids } = makeTree()
    doc.nodes[kids[0]].style.fill = 'pink'
    expect(colorForNewChild(doc, kids[0])).toBe('pink')
  })

  it('mkChild 生成的节点带正确 fill', () => {
    const { doc, root } = makeTree()
    const cmd = mkChild(doc, root)
    const r = executeCommand(doc, emptyHistory(), cmd)
    const newId = Object.keys(r.doc.nodes).find((id) => !doc.nodes[id])!
    expect(r.doc.nodes[newId].style.fill).toBe(BRANCH_COLORS[2])
  })

  it('改父级：fill 等于旧分支色时换为新分支色并同步子树', () => {
    const { doc, root: _root, kids } = makeTree()
    doc.nodes[kids[0]].style.fill = BRANCH_COLORS[0]
    doc.nodes[kids[2]].style.fill = BRANCH_COLORS[0] // 叶子随分支色
    doc.nodes[kids[1]].style.fill = 'pink'
    const cmd = reparentCommand(doc, kids[0], kids[1])!
    expect(cmd).not.toBeNull()
    const r = executeCommand(doc, emptyHistory(), cmd)
    expect(mindData(r.doc.nodes[kids[0]]).parentId).toBe(kids[1])
    expect(r.doc.nodes[kids[0]].style.fill).toBe('pink')
    expect(r.doc.nodes[kids[2]].style.fill).toBe('pink') // 子树同步
  })

  it('改父级到根：fill 等于旧分支色时分配下一轮换色', () => {
    const { doc, root, kids } = makeTree()
    doc.nodes[kids[0]].style.fill = BRANCH_COLORS[0]
    doc.nodes[kids[2]].style.fill = BRANCH_COLORS[0] // 叶子随旧分支色
    const r = executeCommand(doc, emptyHistory(), reparentCommand(doc, kids[2], root)!)
    expect(mindData(r.doc.nodes[kids[2]]).parentId).toBe(root)
    expect(r.doc.nodes[kids[2]].style.fill).toBe(BRANCH_COLORS[2])
  })

  it('不能拖进自己的子树', () => {
    const { doc, kids } = makeTree()
    expect(reparentCommand(doc, kids[0], kids[2])).toBeNull()
  })
})

describe('自动布局合并撤销（B1）', () => {
  it('Tab 加子 + mergeWithPrevious 布局 = 一条历史；undo 移除、redo 恢复布局位置', () => {
    const { doc, root } = makeTree()
    let history = emptyHistory()
    // 模拟 Tab：加子命令
    let r = executeCommand(doc, history, mkChild(doc, root))
    const childId = Object.keys(r.doc.nodes).find((id) => !doc.nodes[id])!
    // 模拟画布 autoLayoutOnChange：布局命令 mergeWithPrevious
    const pos = mindmapLayout(r.doc, { direction: 'TB' })
    const layoutCmd = { ...setNodePositions(pos, '自动布局'), mergeWithPrevious: true }
    r = executeCommand(r.doc, r.history, layoutCmd)
    history = r.history
    // 加子 + 布局 合并为一条历史（初始为空栈 → 仅一条）
    expect(history.past).toHaveLength(1)
    // undo：节点消失
    const u = undoCommand(r.doc, history)
    expect(u.doc.nodes[childId]).toBeUndefined()
    expect(u.history.future).toHaveLength(1)
    // redo：节点回来且位置是布局结果
    const rr = redoCommand(u.doc, u.history)
    expect(rr.doc.nodes[childId]).toBeDefined()
    expect(rr.doc.nodes[childId].position.x).toBeCloseTo(pos[childId].x, 3)
    expect(rr.doc.nodes[childId].position.y).toBeCloseTo(pos[childId].y, 3)
  })

  it('栈为空时 mergeWithPrevious 正常入栈', () => {
    const { doc } = makeTree()
    const cmd = {
      ...setNodePositions({ [doc.zOrder[0]]: { x: 5, y: 5 } }, '自动布局'),
      mergeWithPrevious: true,
    }
    const r = executeCommand(doc, emptyHistory(), cmd)
    expect(r.history.past).toHaveLength(1)
  })
})
