// 思维导图节点的渲染：中心主题为强调色圆角块，其余为分支色胶囊；有子节点时外侧挂折叠钮。
import type { ReactNode } from 'react'
import { patchNode } from '@/core/commands/ops'
import { mindmapRootId } from '@/core/layout/mindmap'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import type { ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import { nodeText } from './shapekit'
import { childrenOf, mindData } from './mindmapTree'

const mm = zh.plugins.mindmap

type NodeProps = { node: DiagramNode; ctx: ShapeRenderContext }

function CollapseBtn({ node, ctx, count }: NodeProps & { count: number }) {
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

function MindText({ node, ctx, accent }: NodeProps & { accent: boolean }) {
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

/** 节点渲染：中心主题为强调色圆角块，其余为分支色胶囊；有子节点时外侧挂折叠钮（真 button，在 svg 外） */
export function mindShape(accent: boolean) {
  return (node: DiagramNode, ctx: ShapeRenderContext): ReactNode => {
    const { w, h } = node.size
    const kids = childrenOf(ctx.doc, node.id).length
    const left = isLeftOfRoot(ctx.doc, node)
    return (
      <>
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
        </svg>
        {/* 折叠钮放在 svg 之外：导出截图把 svg 整棵复制、不逐个过滤子元素，放在里面会被一起导出；
            svg 是 aria-hidden，按钮放在里面读屏也读不到 */}
        {kids > 0 && (
          <div style={{ position: 'absolute', left: left ? -22 : w + 4, top: h / 2 - 9 }}>
            <CollapseBtn node={node} ctx={ctx} count={kids} />
          </div>
        )}
      </>
    )
  }
}
