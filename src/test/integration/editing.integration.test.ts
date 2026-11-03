// 实验 9 集成测试（二）：状态层 documentStore × 命令 × 历史 × 插件 之间的接口交互。
import { beforeEach, describe, expect, it } from 'vitest'
import { addEdge, addNode, deleteElements, moveNodesBy } from '@/core/commands/ops'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'

const store = () => useDocumentStore.getState()

beforeEach(() => store().setDoc(createDoc('flowchart', '集成测试')))

describe('状态层 × 命令 × 历史', () => {
  it('I6 添加、连线、连续移动后逐步撤销与重做，文档与按钮状态一致', () => {
    const a = createNode('process', { x: 0, y: 0 })
    const b = createNode('process', { x: 200, y: 0 })
    store().execute(addNode(a))
    store().execute(addNode(b))
    store().execute(addEdge(createEdge(a.id, b.id)))
    // 两次拖动属于同一条历史（相同 coalesceKey、间隔 < 600ms）
    store().execute({ ...moveNodesBy([a.id], 10, 0), coalesceKey: 'drag' })
    store().execute({ ...moveNodesBy([a.id], 10, 0), coalesceKey: 'drag' })
    expect(store().history.past).toHaveLength(4)
    expect(store().doc.nodes[a.id].position.x).toBe(20)
    expect(store().undoLabel).toBe('移动元素')

    store().undo()
    expect(store().doc.nodes[a.id].position.x).toBe(0)
    store().undo()
    expect(Object.keys(store().doc.edges)).toHaveLength(0)
    expect(store().canRedo).toBe(true)
    store().redo()
    store().redo()
    expect(store().doc.nodes[a.id].position.x).toBe(20)
    expect(store().canRedo).toBe(false)
  })

  it('I7 远端文档写入（协作）不进本地历史，本地历史仍可撤销', () => {
    const a = createNode('process', { x: 0, y: 0 })
    store().execute(addNode(a))
    const remote = { ...store().doc, title: '远端改了标题' }
    store().setDoc(remote, { resetHistory: false, remote: true })
    expect(store().lastChange).toBe('remote')
    expect(store().history.past).toHaveLength(1)
    store().undo()
    expect(store().doc.nodes[a.id]).toBeUndefined()
  })
})

describe('插件 × 状态层', () => {
  it('I8 思维导图：插件键位 Tab 加子主题，插件 expandDeletion 删除整支，一次撤销整支恢复', () => {
    const plugin = getPlugin('mindmap')
    store().setDoc(plugin.templates[0])
    const before = Object.keys(store().doc.nodes).length
    const root = store().doc.zOrder[0]
    const branch = Object.values(store().doc.nodes).find(
      (n) => (n.data as { parentId?: string }).parentId === root,
    )!
    const ctx = {
      doc: store().doc,
      selection: { nodeIds: [branch.id], edgeIds: [] },
      dispatchEvent: () => {},
    }
    store().execute(plugin.keymap!.Tab(ctx)!)
    expect(Object.keys(store().doc.nodes)).toHaveLength(before + 1)

    const ids = plugin.expandDeletion!(store().doc, [branch.id])
    expect(ids.length).toBeGreaterThan(1) // 分支本身 + 子孙（含刚加的子主题）
    store().execute(deleteElements(ids, []))
    expect(Object.keys(store().doc.nodes)).toHaveLength(before + 1 - ids.length)
    store().undo()
    expect(Object.keys(store().doc.nodes)).toHaveLength(before + 1)
  })
})
