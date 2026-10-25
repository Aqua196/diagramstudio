// 思维导图插件（SPEC §3.2）：data.parentId 树、左右交替布局、折叠子树、
// Tab 加子主题 / Enter 加同级、拖到节点上改父级、文档变化自动重排、删除整棵子树。
import type { ReactNode } from 'react'
import { CornerDownRight, ListPlus } from 'lucide-react'
import { addNode } from '@/core/commands/ops'
import { collapsedDescendants, mindmapLayout, mindmapRootId } from '@/core/layout/mindmap'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import type { DiagramPlugin, EditorContext, ShapeDef } from '@/core/plugin'
import { mindShape } from './mindmapNode'
import { zh } from '@/i18n/zh'
import { shapeIcons } from './shapeIcons'
import {
  expandMindmapDeletion,
  mindData,
  mindmapTemplate,
  mkChild,
  reparentCommand,
} from './mindmapTree'

const sh = zh.plugins.shapes
const mm = zh.plugins.mindmap

export const mindmapShapes: ShapeDef<ReactNode>[] = [
  {
    kind: 'centerTopic',
    name: sh.centerTopic,
    icon: shapeIcons.centerTopic,
    defaultSize: { w: 180, h: 60 },
    defaultText: sh.centerTopic,
    paletteHidden: true,
    render: mindShape(true),
  },
  {
    kind: 'topic',
    name: sh.topic,
    icon: shapeIcons.topic,
    defaultSize: { w: 140, h: 40 },
    render: mindShape(false),
  },
]

/** 中心主题节点（空白文档 / 没有根时的形状坞点击） */
function rootNode(): DiagramNode {
  const root = createNode('centerTopic', { x: 0, y: 0 }, { w: 180, h: 60 }, sh.centerTopic)
  root.data = { parentId: null }
  return root
}

function blankMindmap(title: string): DiagramDoc {
  const doc = createDoc('mindmap', title)
  const root = rootNode()
  doc.nodes[root.id] = root
  doc.zOrder = [root.id]
  return doc
}

const addChild = (ctx: EditorContext) =>
  mkChild(ctx.doc, ctx.selection.nodeIds[0] ?? mindmapRootId(ctx.doc))

const addSibling = (ctx: EditorContext) => {
  const sel = ctx.selection.nodeIds[0]
  if (!sel || !ctx.doc.nodes[sel]) return null
  const parent = mindData(ctx.doc.nodes[sel]).parentId
  // 根没有同级：退化为加子主题
  return mkChild(ctx.doc, parent ?? sel)
}

export const mindmapPlugin: DiagramPlugin<ReactNode> = {
  type: 'mindmap',
  shapes: mindmapShapes,
  edgeDefaults: {
    routing: 'bezier',
    arrowStart: 'none',
    arrowEnd: 'none',
    style: { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
  },
  layout: mindmapLayout,
  autoLayoutOnChange: true,
  edgeAxis: 'horizontal',
  hiddenNodeIds: (doc) => collapsedDescendants(doc),
  expandDeletion: expandMindmapDeletion,
  onDropOnNode: (doc, draggedId, targetId) => reparentCommand(doc, draggedId, targetId),
  keymap: { Tab: addChild, Enter: addSibling },
  nodeActions: [
    {
      id: 'child',
      label: mm.addChild,
      kbd: 'Tab',
      icon: <CornerDownRight size={16} />,
      run: addChild,
    },
    {
      id: 'sibling',
      label: mm.addSibling,
      kbd: 'Enter',
      icon: <ListPlus size={16} />,
      run: addSibling,
    },
  ],
  placeFromPalette: (doc, kind, selection) => {
    const root = mindmapRootId(doc)
    if (!root) return addNode(rootNode())
    if (kind !== 'topic') return null
    const parent = selection.nodeIds.find((id) => doc.nodes[id]) ?? root
    return mkChild(doc, parent)
  },
  quickAddSides: [],
  createBlank: blankMindmap,
  tips: zh.plugins.tips.mindmap,
  templates: [mindmapTemplate()],
}
