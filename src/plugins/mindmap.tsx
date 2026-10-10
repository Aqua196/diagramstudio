// 思维导图插件（SPEC §3.2）：data.parentId 树、左右交替布局、折叠子树、
// Tab 加子主题 / Enter 加同级、拖到节点上改父级、文档变化自动重排。
import type { ReactNode } from 'react'
import { addNode, patchNode } from '@/core/commands/ops'
import type { Command } from '@/core/commands/command'
import { collapsedDescendants, mindmapLayout, mindmapRootId } from '@/core/layout/mindmap'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import type { DiagramPlugin, ShapeDef, ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'

const sh = zh.plugins.shapes

interface MindData {
  parentId?: string | null
  collapsed?: boolean
}

const data = (n: DiagramNode): MindData => n.data as MindData

const childrenOf = (doc: DiagramDoc, id: string): string[] =>
  doc.zOrder.filter((z) => {
    const n: DiagramNode | undefined = doc.nodes[z]
    return !!n && data(n).parentId === id
  })

/** 是否为 target 的后代（防止拖成环） */
function isDescendant(doc: DiagramDoc, maybeChild: string, ancestor: string): boolean {
  let cur: string | null = maybeChild
  while (cur) {
    if (cur === ancestor) return true
    const n: DiagramNode | undefined = doc.nodes[cur]
    cur = n ? (data(n).parentId ?? null) : null
  }
  return false
}

/** 节点渲染：圆角胶囊；有子节点时在右侧挂折叠圆钮（点击 dispatch patchNode 切换 collapsed） */
function mindShape(accent: boolean) {
  return (node: DiagramNode, ctx: ShapeRenderContext): ReactNode => {
    const { w, h } = node.size
    const d = data(node)
    const hasChildren = childrenOf(ctx.doc, node.id).length > 0
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
        <rect
          width={w}
          height={h}
          rx={accent ? 10 : h / 2}
          fill={accent ? 'var(--accent)' : 'var(--node-fill)'}
          stroke={accent ? 'var(--accent)' : 'var(--node-stroke)'}
          strokeWidth={node.style.strokeWidth}
        />
        {!accent && <line x1={8} y1={h - 5} x2={w - 8} y2={h - 5} stroke="var(--node-stroke)" strokeWidth={1} opacity={0.35} />}
        <foreignObject x={8} y={2} width={w - 16} height={h - 6}>
          <div
            style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: node.style.fontSize, fontWeight: accent || node.style.bold ? 700 : 400,
              color: accent ? '#fff' : 'var(--node-text)', overflow: 'hidden', textAlign: 'center',
              pointerEvents: 'none', wordBreak: 'break-word',
            }}
          >
            {ctx.editing ? '' : node.text}
          </div>
        </foreignObject>
        {hasChildren && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              ctx.dispatch(patchNode(node.id, { data: { ...d, collapsed: !d.collapsed } }, '切换折叠'))
            }}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={w + 8} cy={h / 2} r={7} fill="var(--panel)" stroke="var(--line)" />
            <text x={w + 8} y={h / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--ink-2)">
              {d.collapsed ? '+' : '−'}
            </text>
          </g>
        )}
      </svg>
    )
  }
}

export const mindmapShapes: ShapeDef<ReactNode>[] = [
  { kind: 'centerTopic', name: sh.centerTopic, defaultSize: { w: 180, h: 60 }, render: mindShape(true) },
  { kind: 'topic', name: '分支主题', defaultSize: { w: 140, h: 40 }, render: mindShape(false) },
]

function mkChild(parentId: string | null): Command {
  const child = createNode(
    'topic',
    { x: 0, y: 0 },
    { w: 140, h: 40 },
    '分支主题',
  )
  child.data = { parentId }
  return addNode(child)
}

function mindmapTemplate(): DiagramDoc {
  const doc = createDoc('mindmap', '项目规划')
  const root = createNode('centerTopic', { x: 0, y: 0 }, { w: 180, h: 60 }, '项目规划')
  root.data = { parentId: null }
  doc.nodes[root.id] = root
  doc.zOrder = [root.id]
  const topics = ['需求分析', '系统设计', '开发实现', '测试验收']
  for (const t of topics) {
    const n = createNode('topic', { x: 0, y: 0 }, { w: 140, h: 40 }, t)
    n.data = { parentId: root.id }
    doc.nodes[n.id] = n
    doc.zOrder.push(n.id)
  }
  return doc
}

export const mindmapPlugin: DiagramPlugin<ReactNode> = {
  type: 'mindmap',
  shapes: mindmapShapes,
  edgeDefaults: {
    routing: 'bezier',
    arrowStart: 'none',
    arrowEnd: 'none',
    style: { stroke: 'ink', strokeWidth: 1.5, dash: 'solid' },
  },
  layout: mindmapLayout,
  autoLayoutOnChange: true,
  hiddenNodeIds: (doc) => collapsedDescendants(doc),
  onDropOnNode: (doc, draggedId, targetId) => {
    if (draggedId === targetId) return null
    const dragged = doc.nodes[draggedId]
    if (!dragged || !doc.nodes[targetId]) return null
    if (dragged.kind === 'centerTopic') return null // 根节点不可改父级
    if (isDescendant(doc, targetId, draggedId)) return null // 不能拖进自己的子树
    return patchNode(draggedId, { data: { ...data(dragged), parentId: targetId } }, '调整层级')
  },
  keymap: {
    Tab: (ctx) => mkChild(ctx.selection.nodeIds[0] ?? mindmapRootId(ctx.doc)),
    Enter: (ctx) => {
      const sel = ctx.selection.nodeIds[0]
      if (!sel) return null
      const d = data(ctx.doc.nodes[sel])
      return mkChild(d.parentId ?? null)
    },
  },
  templates: [mindmapTemplate()],
}
