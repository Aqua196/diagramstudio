// 文档缩略图：按节点形状/配色把整张图缩画成 SVG（首页新建卡与最近文档共用）。
// 不画文字，用一条短横线示意，缩到很小也干净。
import { memo, useMemo } from 'react'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { NODE_COLORS, resolveStroke, type NodeColorKey, type ThemeName } from '@/core/palette'
import { useUiStore } from '@/store/uiStore'

const PAD = 14

function fillOf(n: DiagramNode, theme: ThemeName): string {
  if (n.kind === 'centerTopic') return 'var(--accent)'
  const k = (n.style.fill in NODE_COLORS ? n.style.fill : 'white') as NodeColorKey
  return NODE_COLORS[k][theme]
}

function NodeShape({ n, theme }: { n: DiagramNode; theme: ThemeName }) {
  const { x, y } = n.position
  const { w, h } = n.size
  const fill = fillOf(n, theme)
  const stroke =
    n.kind === 'centerTopic' ? 'var(--accent)' : resolveStroke(n.style.stroke, n.style.fill, theme)
  const common = { fill, stroke, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const }
  if (n.kind === 'decision') {
    return (
      <polygon
        points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`}
        {...common}
      />
    )
  }
  if (n.kind === 'connector' || n.kind === 'terminator2') {
    return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />
  }
  const round = ['terminator', 'topic'].includes(n.kind) ? h / 2 : n.kind === 'centerTopic' ? 14 : 6
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={round} {...common} />
      {(n.kind === 'entity' || n.kind === 'weakEntity') && (
        <rect x={x} y={y} width={w} height={30} rx={6} fill={stroke} opacity={0.18} />
      )}
    </g>
  )
}

/** ER 实体的字段行示意：每行一条短横线 */
function FieldBars({ n }: { n: DiagramNode }) {
  const fields = (n.data as { fields?: unknown[] }).fields ?? []
  return (
    <>
      {fields.map((_, i) => {
        const y = n.position.y + 30 + i * 26 + 13
        return (
          <line
            key={i}
            x1={n.position.x + 14}
            y1={y}
            x2={n.position.x + 14 + n.size.w * 0.45}
            y2={y}
            stroke="var(--ink-3)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.35}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </>
  )
}

function TextBar({ n }: { n: DiagramNode }) {
  const isEntity = n.kind === 'entity' || n.kind === 'weakEntity'
  const cy = isEntity ? n.position.y + 15 : n.position.y + n.size.h / 2
  const half = Math.min(n.size.w * 0.28, 40)
  const cx = n.position.x + n.size.w / 2
  const color = n.kind === 'centerTopic' ? 'var(--accent-ink)' : 'var(--ink-3)'
  return (
    <line
      x1={cx - half}
      y1={cy}
      x2={cx + half}
      y2={cy}
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      opacity={0.55}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function edgesOf(doc: DiagramDoc): Array<[DiagramNode, DiagramNode]> {
  const out: Array<[DiagramNode, DiagramNode]> = []
  for (const e of Object.values(doc.edges)) {
    const a = doc.nodes[e.source]
    const b = doc.nodes[e.target]
    if (a && b) out.push([a, b])
  }
  for (const n of Object.values(doc.nodes)) {
    const p = n.data?.parentId
    if (typeof p === 'string' && doc.nodes[p]) out.push([doc.nodes[p], n])
  }
  return out
}

/** 自动布局类插件（思维导图）的模板位置是占位的，先按插件布局摆好再缩画 */
function laidOut(doc: DiagramDoc): DiagramDoc {
  const plugin = getPlugin(doc.type)
  if (!plugin.autoLayoutOnChange || Object.keys(doc.nodes).length === 0) return doc
  const pos = plugin.layout(doc, { direction: doc.settings.layoutDirection })
  const nodes: DiagramDoc['nodes'] = {}
  for (const [id, n] of Object.entries(doc.nodes))
    nodes[id] = pos[id] ? { ...n, position: pos[id] } : n
  return { ...doc, nodes }
}

function MiniDiagramInner({ doc: raw, className }: { doc: DiagramDoc; className?: string }) {
  const theme = useUiStore((s) => s.resolvedTheme)
  const doc = useMemo(() => laidOut(raw), [raw])
  const nodes = Object.values(doc.nodes)
  if (nodes.length === 0) return <svg className={className} aria-hidden />
  const minX = Math.min(...nodes.map((n) => n.position.x)) - PAD
  const minY = Math.min(...nodes.map((n) => n.position.y)) - PAD
  const maxX = Math.max(...nodes.map((n) => n.position.x + n.size.w)) + PAD
  const maxY = Math.max(...nodes.map((n) => n.position.y + n.size.h)) + PAD
  const c = (n: DiagramNode) => [n.position.x + n.size.w / 2, n.position.y + n.size.h / 2] as const
  return (
    <svg
      className={className}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {edgesOf(doc).map(([a, b], i) => {
        const [x1, y1] = c(a)
        const [x2, y2] = c(b)
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--edge)"
            strokeWidth={1.5}
            opacity={0.7}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <NodeShape n={n} theme={theme} />
          <TextBar n={n} />
          <FieldBars n={n} />
        </g>
      ))}
    </svg>
  )
}

export const MiniDiagram = memo(MiniDiagramInner)
