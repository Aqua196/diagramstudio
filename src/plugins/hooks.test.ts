// 插件上手钩子：空白文档、形状坞放置、工具条动作、快捷添加规则、提示文案。
import { describe, expect, it } from 'vitest'
import { mindmapRootId } from '@/core/layout/mindmap'
import { createDoc } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'
import { getPlugin } from './registry'
import { mindData } from './mindmapTree'
import { fieldsOf } from './erModel'

const mind = getPlugin('mindmap')
const flow = getPlugin('flowchart')
const er = getPlugin('er')

function run(doc: DiagramDoc, cmd: { apply: (d: DiagramDoc) => void } | null): DiagramDoc {
  const next = structuredClone(doc)
  cmd?.apply(next)
  return next
}

describe('思维导图钩子', () => {
  it('空白导图自带中心主题；中心主题不进形状坞', () => {
    const doc = mind.createBlank!('t')
    const root = mindmapRootId(doc)!
    expect(doc.nodes[root].kind).toBe('centerTopic')
    expect(mind.shapes.find((s) => s.kind === 'centerTopic')?.paletteHidden).toBe(true)
  })

  it('形状坞点「主题」：挂到所选主题下；无选择挂到根下', () => {
    const doc = mind.createBlank!('t')
    const root = mindmapRootId(doc)!
    const a = run(doc, mind.placeFromPalette!(doc, 'topic', { nodeIds: [] }))
    const child = Object.values(a.nodes).find((n) => n.id !== root)!
    expect(mindData(child).parentId).toBe(root)
    const b = run(a, mind.placeFromPalette!(a, 'topic', { nodeIds: [child.id] }))
    expect(Object.values(b.nodes).some((n) => mindData(n).parentId === child.id)).toBe(true)
  })

  it('没有根时形状坞先补一个中心主题', () => {
    const empty = createDoc('mindmap')
    const next = run(empty, mind.placeFromPalette!(empty, 'topic', { nodeIds: [] }))
    expect(Object.values(next.nodes)[0].kind).toBe('centerTopic')
  })

  it('工具条「添加同级」：在根上退化为添加子主题', () => {
    const doc = mind.createBlank!('t')
    const root = mindmapRootId(doc)!
    const sibling = mind.nodeActions!.find((a) => a.id === 'sibling')!
    const next = run(
      doc,
      sibling.run({ doc, selection: { nodeIds: [root], edgeIds: [] }, dispatchEvent: () => {} }),
    )
    expect(Object.keys(next.nodes)).toHaveLength(2)
  })

  it('关闭四周快捷加号（层级由 Tab/Enter 表达）', () => {
    expect(mind.quickAddSides).toEqual([])
  })
})

describe('流程图 / ER 钩子', () => {
  it('nextKind：起止/判断之后接处理，其余同形状', () => {
    expect(flow.nextKind!('terminator')).toBe('process')
    expect(flow.nextKind!('decision')).toBe('process')
    expect(flow.nextKind!('io')).toBe('io')
  })

  it('ER「添加字段」动作追加一行并同步实体高度', () => {
    const doc = createDoc('er')
    const shape = er.shapes[0]
    const node = {
      id: 'e1',
      kind: shape.kind,
      position: { x: 0, y: 0 },
      size: { ...shape.defaultSize },
      text: '学生',
      style: {
        fill: 'white',
        stroke: 'ink',
        strokeWidth: 1.5,
        dash: 'solid' as const,
        fontSize: 14,
        bold: false,
        align: 'center' as const,
      },
      data: shape.defaultData!(),
    }
    doc.nodes.e1 = node
    doc.zOrder = ['e1']
    const add = er.nodeActions!.find((a) => a.id === 'addField')!
    const next = run(
      doc,
      add.run({ doc, selection: { nodeIds: ['e1'], edgeIds: [] }, dispatchEvent: () => {} }),
    )
    expect(fieldsOf(next.nodes.e1)).toHaveLength(2)
    expect(next.nodes.e1.size.h).toBeGreaterThan(node.size.h)
  })

  it('三种图都带上手提示，每个形状都有图标', () => {
    for (const p of [flow, mind, er]) {
      expect(p.tips?.idle.length).toBeGreaterThan(0)
      for (const s of p.shapes) expect(s.icon).toBeTruthy()
    }
  })
})
