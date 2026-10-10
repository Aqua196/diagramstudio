// 思维导图插件（SPEC §3.2）：data.parentId 树、左右交替布局、折叠子树、
// Tab 加子主题 / Enter 加同级、拖到节点上改父级、文档变化自动重排、删除整棵子树。
import type { ReactNode } from 'react'
import { patchNode } from '@/core/commands/ops'
import { collapsedDescendants, mindmapLayout, mindmapRootId } from '@/core/layout/mindmap'
import type { DiagramNode } from '@/core/model/types'
import type { DiagramPlugin, ShapeDef, ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'
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

function CollapseBtn({ node, ctx }: { node: DiagramNode; ctx: ShapeRenderContext }) {
  const d = mindData(node)
  return (
    <button
      type="button"
      className="ds-mind-collapse ds-export-exclude"
      aria-label={d.collapsed ? mm.expand : mm.collapse}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        ctx.dispatch(
          patchNode(node.id, { data: { ...d, collapsed: !d.collapsed } }, mm.toggleCollapse),
        )
      }}
    >
      {d.collapsed ? '+' : '−'}
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
          fontWeight: accent || node.style.bold ? 700 : 400,
          color: accent ? 'var(--accent-ink)' : 'var(--node-text)',
          overflow: 'hidden',
          textAlign: 'center',
          pointerEvents: 'none',
          wordBreak: 'break-word',
        }}
      >
        {ctx.editing ? '' : node.text}
      </div>
    </foreignObject>
  )
}

/** 节点渲染：圆角胶囊；有子节点时右侧挂折叠按钮（真 button，键盘可达） */
function mindShape(accent: boolean) {
  return (node: DiagramNode, ctx: ShapeRenderContext): ReactNode => {
    const { w, h } = node.size
    const hasChildren = childrenOf(ctx.doc, node.id).length > 0
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
          rx={accent ? 10 : h / 2}
          fill={accent ? 'var(--accent)' : 'var(--node-fill)'}
          stroke={accent ? 'var(--accent)' : 'var(--node-stroke)'}
          strokeWidth={node.style.strokeWidth}
        />
        {!accent && (
          <line
            x1={8}
            y1={h - 5}
            x2={w - 8}
            y2={h - 5}
            stroke="var(--node-stroke)"
            strokeWidth={1}
            opacity={0.35}
          />
        )}
        <MindText node={node} ctx={ctx} accent={accent} />
        {hasChildren && (
          <foreignObject x={w + 1} y={h / 2 - 8} width={16} height={16}>
            <CollapseBtn node={node} ctx={ctx} />
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
    defaultSize: { w: 180, h: 60 },
    render: mindShape(true),
  },
  { kind: 'topic', name: sh.topic, defaultSize: { w: 140, h: 40 }, render: mindShape(false) },
]

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
  hiddenNodeIds: (doc) => collapsedDescendants(doc),
  expandDeletion: expandMindmapDeletion,
  onDropOnNode: (doc, draggedId, targetId) => reparentCommand(doc, draggedId, targetId),
  keymap: {
    Tab: (ctx) => mkChild(ctx.doc, ctx.selection.nodeIds[0] ?? mindmapRootId(ctx.doc)),
    Enter: (ctx) => {
      const sel = ctx.selection.nodeIds[0]
      if (!sel) return null
      const d = mindData(ctx.doc.nodes[sel])
      return mkChild(ctx.doc, d.parentId ?? null)
    },
  },
  templates: [mindmapTemplate()],
}
