// 上手交互的纯逻辑：快捷加号（方向、下一步形状、避让、已连线侧）、统一建节点/连线、
// 加节点后的焦点交接、多选统一改样式。
import { beforeEach, describe, expect, it } from 'vitest'
import { addNode } from '@/core/commands/ops'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { useCanvasStore } from './canvasStore'
import { patchNodesStyle } from './commands'
import { executeAndFocus } from './focus'
import { createPluginEdge, createShapeNode } from './nodeFactory'
import { buildQuickAdd, usedSides } from './QuickAdd'

const flow = getPlugin('flowchart')
const er = getPlugin('er')

function docWith(kind: string): { doc: DiagramDoc; id: string } {
  const doc = createDoc('flowchart')
  const n = createNode(kind, { x: 0, y: 0 }, { w: 140, h: 48 }, 'A')
  doc.nodes[n.id] = n
  doc.zOrder = [n.id]
  return { doc, id: n.id }
}

function apply(doc: DiagramDoc, cmd: ReturnType<typeof buildQuickAdd>): DiagramDoc {
  const next = structuredClone(doc)
  cmd!.apply(next)
  return next
}

describe('buildQuickAdd', () => {
  it('起止之后接「处理」，放在下方并连线', () => {
    const { doc, id } = docWith('terminator')
    const next = apply(doc, buildQuickAdd(doc, flow, id, 'bottom'))
    const added = Object.values(next.nodes).find((n) => n.id !== id)!
    expect(added.kind).toBe('process')
    expect(added.position.y).toBeGreaterThan(48)
    const edge = Object.values(next.edges)[0]
    expect(edge.source).toBe(id)
    expect(edge.target).toBe(added.id)
    expect(edge.routing).toBe(flow.edgeDefaults.routing)
  })

  it('该方向已有节点时继续往外找空位', () => {
    const { doc, id } = docWith('process')
    const first = apply(doc, buildQuickAdd(doc, flow, id, 'right'))
    const second = apply(first, buildQuickAdd(first, flow, id, 'right'))
    const xs = Object.values(second.nodes)
      .filter((n) => n.id !== id)
      .map((n) => n.position.x)
      .sort((a, b) => a - b)
    expect(xs).toHaveLength(2)
    expect(xs[1]).toBeGreaterThan(xs[0] + 140)
  })

  it('ER 新关系带默认基数 1 对 0..N', () => {
    const doc = createDoc('er')
    const e = createShapeNode(er, 'entity', { x: 0, y: 0 })!
    doc.nodes[e.id] = e
    doc.zOrder = [e.id]
    const next = apply(doc, buildQuickAdd(doc, er, e.id, 'right'))
    expect(Object.values(next.edges)[0].cardinality).toEqual({ source: '1', target: '0..N' })
  })
})

describe('usedSides', () => {
  it('按显式锚点或方位推算已连线的一侧', () => {
    const { doc, id } = docWith('process')
    const b = createNode('process', { x: 0, y: 300 }, { w: 140, h: 48 })
    const c = createNode('process', { x: 400, y: 0 }, { w: 140, h: 48 })
    doc.nodes[b.id] = b
    doc.nodes[c.id] = c
    const e1 = createEdge(id, b.id)
    const e2 = createEdge(c.id, id, { sourceHandle: 'left', targetHandle: 'top' })
    doc.edges[e1.id] = e1
    doc.edges[e2.id] = e2
    expect([...usedSides(doc, id)].sort()).toEqual(['bottom', 'top'])
  })
})

describe('nodeFactory', () => {
  it('createShapeNode 居中放置并带上插件默认文字与私有数据', () => {
    const n = createShapeNode(er, 'entity', { x: 100, y: 100 })!
    expect(n.position.x + n.size.w / 2).toBeCloseTo(100)
    expect(n.text).toBe('实体')
    expect((n.data as { fields: Array<{ name: string; pk?: boolean }> }).fields[0]).toMatchObject({
      name: 'id',
      pk: true,
    })
    // 每次调用是新对象，节点之间不共享字段数组
    const m = createShapeNode(er, 'entity', { x: 0, y: 0 })!
    expect(m.data).not.toBe(n.data)
  })

  it('吸附时左上角对齐 12px 网格', () => {
    const n = createShapeNode(flow, 'process', { x: 103, y: 77 }, true)!
    expect(n.position.x % 12).toBe(0)
    expect(n.position.y % 12).toBe(0)
  })

  it('createPluginEdge 套用插件默认线型，extra 可覆盖', () => {
    const e = createPluginEdge(flow, 'a', 'b', { label: '是' })
    expect(e.routing).toBe('step')
    expect(e.label).toBe('是')
    expect(e.cardinality).toBeUndefined()
  })
})

describe('executeAndFocus', () => {
  beforeEach(() => {
    useDocumentStore.getState().setDoc(createDoc('flowchart'))
    useCanvasStore.getState().setEditingNode(null)
  })

  it('新增恰好一个节点 → 选中并进入编辑', () => {
    const n = createNode('process', { x: 0, y: 0 })
    expect(executeAndFocus(addNode(n))).toBe(n.id)
    expect(useUiStore.getState().selection.nodeIds).toEqual([n.id])
    expect(useCanvasStore.getState().editingNodeId).toBe(n.id)
  })

  it('edit:false 只选中不编辑', () => {
    const n = createNode('process', { x: 0, y: 0 })
    executeAndFocus(addNode(n), { edit: false })
    expect(useCanvasStore.getState().editingNodeId).toBeNull()
  })
})

describe('patchNodesStyle', () => {
  it('多选改色是一条命令：一次撤销全部还原', () => {
    const doc = createDoc('flowchart')
    const a = createNode('process', { x: 0, y: 0 })
    const b = createNode('process', { x: 200, y: 0 })
    doc.nodes[a.id] = a
    doc.nodes[b.id] = b
    doc.zOrder = [a.id, b.id]
    const store = useDocumentStore.getState()
    store.setDoc(doc)
    store.execute(patchNodesStyle([a.id, b.id], { fill: 'teal' }, '修改颜色'))
    const after = useDocumentStore.getState().doc
    expect(after.nodes[a.id].style.fill).toBe('teal')
    expect(after.nodes[b.id].style.fill).toBe('teal')
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().doc.nodes[b.id].style.fill).toBe('white')
  })
})
