// 思维导图插件（SPEC §3.2）：data.parentId 树、左右交替布局、折叠子树、
// Tab 加子主题 / Enter 加同级、拖到节点上改父级、文档变化自动重排、删除整棵子树。
import type { ReactNode } from 'react'
import { CornerDownRight, ListPlus } from 'lucide-react'
import { addNode, patchNode } from '@/core/commands/ops'
import { collapsedDescendants, mindmapLayout, mindmapRootId } from '@/core/layout/mindmap'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import type { DiagramPlugin, EditorContext, ShapeDef, ShapeRenderContext } from '@/core/plugin'
import { nodeText } from './shapekit'
import { zh } from '@/i18n/zh'
import { shapeIcons } from './shapeIcons'
import {
  childrenOf,
  expandMindmapDeletion,
  mindData,
  mindmapTemplate,
  mkChild,
  reparentCommand,
} from './mindmapTree'

const sh = zh.plugins.shapes
const mm = zh.plugins.mindmap

function CollapseBtn({ node, ctx, count }: { node: DiagramNode; ctx: ShapeRenderContext; count: number }) {
  const d = mindData(node)
  return (
    <button
      type="button"
      className="ds-mind-collapse ds-export-exclude nodrag nopan"
      data-collapsed={d.collapsed ? 'true' : 'false'}
      aria-label={d.collapsed ? mm.expand : mm.collapse}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        ctx.dispatch(
          patchNode(node.id, { data: { ...d, collapsed: !d.collapsed } }, mm.toggleCollapse),
        )
      }}
    >
      {d.collapsed ? count : '−'}
    </button>
  )
}

function MindText({ node, ctx, accent }: { node: DiagramNode; ctx: ShapeRenderContext; accent: boolean }) {
  const { w, h } = node.size
  return (
    <foreignObject x={8} y={2} width={w - 16} height={h - 6}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: node.style.fontSize,
          fontWeight: accent || node.style.bold ? 650 : 450,
          lineHeight: 1.3,
          color: accent ? 'var(--accent-ink)' : 'var(--node-text)',
          overflow: 'hidden',
          textAlign: 'center',
          pointerEvents: 'none',
          wordBreak: 'break-word',
        }}
      >
        {nodeText(node, ctx)}
      </div>
    </foreignObject>
  )
}

/** 节点在根的左侧时折叠钮放左边（朝外），否则放右边 */
function isLeftOfRoot(doc: DiagramDoc, node: DiagramNode): boolean {
  const root = doc.nodes[mindmapRootId(doc) ?? '']
  if (!root || root.id === node.id) return false
  return node.position.x + node.size.w / 2 < root.position.x + root.size.w / 2
}

/** 节点渲染：中心主题为强调色圆角块，其余为分支色胶囊；有子节点时外侧挂折叠钮（真 button） */
function mindShape(accent: boolean) {
  return (node: DiagramNode, ctx: ShapeRenderContext): ReactNode => {
    const { w, h } = node.size
    const kids = childrenOf(ctx.doc, node.id).length
    const left = isLeftOfRoot(ctx.doc, node)
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden
      >
        <rect
          width={w}
          height={h}
          rx={accent ? 14 : h / 2}
          fill={accent ? 'var(--accent)' : 'var(--node-fill)'}
          stroke={accent ? 'var(--accent)' : 'var(--node-stroke)'}
          strokeWidth={accent ? 0 : node.style.strokeWidth}
        />
        <MindText node={node} ctx={ctx} accent={accent} />
        {kids > 0 && (
          <foreignObject x={left ? -22 : w + 4} y={h / 2 - 9} width={18} height={18}>
            <CollapseBtn node={node} ctx={ctx} count={kids} />
          </foreignObject>
        )}
      </svg>
    )
  }
}

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
    { id: 'child', label: mm.addChild, kbd: 'Tab', icon: <CornerDownRight size={16} />, run: addChild },
    { id: 'sibling', label: mm.addSibling, kbd: 'Enter', icon: <ListPlus size={16} />, run: addSibling },
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
