// 基座插件（IMPL_CONTRACT §4）：阶段2 预置的通用形状与 dagre 布局，
// 让画布/外壳在阶段5 之前就有真实接口可渲染；阶段5 以 registerPlugin 覆盖。
import type { ReactNode } from 'react'
import { dagreLayout } from '@/core/layout/dagre'
import { collapsedDescendants, mindmapLayout } from '@/core/layout/mindmap'
import { createDoc } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode, DiagramType } from '@/core/model/types'
import type { DiagramPlugin, ShapeDef, ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'

const sh = zh.plugins.shapes

/** 简单 SVG 形状：颜色一律走 --node-fill/--node-stroke 变量（画布解析 palette+主题后注入） */
function svgShape(
  node: DiagramNode,
  body: (w: number, h: number) => ReactNode,
  ctx: ShapeRenderContext,
): ReactNode {
  const { w, h } = node.size
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {body(w, h)}
      <text
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.style.fontSize}
        fontWeight={node.style.bold ? 700 : 400}
        fill="var(--node-text)"
      >
        {ctx.editing ? '' : node.text}
      </text>
    </svg>
  )
}

const baseShapes: ShapeDef<ReactNode>[] = [
  {
    kind: 'process',
    name: sh.process,
    defaultSize: { w: 140, h: 56 },
    render: (n, ctx) =>
      svgShape(n, (w, h) => <rect width={w} height={h} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={n.style.strokeWidth} />, ctx),
  },
  {
    kind: 'terminator',
    name: sh.terminator,
    defaultSize: { w: 140, h: 48 },
    render: (n, ctx) =>
      svgShape(n, (w, h) => <rect width={w} height={h} rx={h / 2} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={n.style.strokeWidth} />, ctx),
  },
  {
    kind: 'decision',
    name: sh.decision,
    defaultSize: { w: 140, h: 80 },
    render: (n, ctx) =>
      svgShape(n, (w, h) => <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={n.style.strokeWidth} />, ctx),
  },
  {
    kind: 'database',
    name: sh.database,
    defaultSize: { w: 120, h: 72 },
    render: (n, ctx) =>
      svgShape(
        n,
        (w, h) => (
          <>
            <ellipse cx={w / 2} cy={12} rx={w / 2} ry={12} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={n.style.strokeWidth} />
            <path d={`M0,12 L0,${h - 12} A${w / 2},12 0 0 0 ${w},${h - 12} L${w},12`} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={n.style.strokeWidth} />
          </>
        ),
        ctx,
      ),
  },
]

function makeBasePlugin(type: DiagramType, layout: DiagramPlugin['layout']): DiagramPlugin<ReactNode> {
  const template: DiagramDoc = createDoc(type, `${zh.plugins.typeNames[type]}示例`)
  const plugin: DiagramPlugin<ReactNode> = {
    type,
    shapes: baseShapes,
    edgeDefaults: {
      routing: 'bezier',
      arrowStart: 'none',
      arrowEnd: 'arrow',
      style: { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
    },
    layout,
    templates: [template],
  }
  if (type === 'mindmap') {
    plugin.hiddenNodeIds = (doc) => collapsedDescendants(doc)
    plugin.autoLayoutOnChange = true
  }
  return plugin
}

export function basePlugin(type: DiagramType): DiagramPlugin<ReactNode> {
  if (type === 'mindmap') return makeBasePlugin(type, mindmapLayout)
  return makeBasePlugin(type, dagreLayout)
}
