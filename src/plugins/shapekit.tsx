// 三个插件共享的 SVG 渲染件：颜色一律用画布注入的 --node-* 变量。
import type { ReactNode } from 'react'
import type { DiagramNode } from '@/core/model/types'
import type { ShapeRenderContext } from '@/core/plugin'

/** 形状文字位的内容：平时是文字，编辑中换成画布给的行内编辑框（同一位置、同一套字体与颜色） */
export function nodeText(node: DiagramNode, ctx: ShapeRenderContext): ReactNode {
  return ctx.editing ? ((ctx.editor ?? null) as ReactNode) : node.text
}

export function svgShell(
  node: DiagramNode,
  body: (w: number, h: number) => ReactNode,
  ctx: ShapeRenderContext,
  opts?: { textPad?: number; extra?: ReactNode },
): ReactNode {
  const { w, h } = node.size
  const pad = opts?.textPad ?? 6
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      {body(w, h)}
      <foreignObject x={pad} y={pad} width={w - pad * 2} height={h - pad * 2}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: node.style.align === 'left' ? 'flex-start' : node.style.align === 'right' ? 'flex-end' : 'center',
            textAlign: node.style.align,
            fontSize: node.style.fontSize,
            fontWeight: node.style.bold ? 650 : 450,
            lineHeight: 1.35,
            color: 'var(--node-text)',
            overflow: 'hidden',
            wordBreak: 'break-word',
            pointerEvents: 'none',
          }}
        >
          {nodeText(node, ctx)}
        </div>
      </foreignObject>
      {opts?.extra}
    </svg>
  )
}

const sw = (n: DiagramNode) => n.style.strokeWidth
const dash = (n: DiagramNode) => (n.style.dash === 'dashed' ? '6 4' : undefined)

export const shapePaths = {
  rect: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => <rect width={w} height={h} rx={Math.min(8, h / 4)} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)} />, ctx),

  rounded: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => <rect width={w} height={h} rx={h / 2} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)} />, ctx),

  diamond: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)} />, ctx, { textPad: 22 }),

  parallelogram: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => {
      const s = Math.min(20, w * 0.18)
      return <polygon points={`${s},0 ${w},0 ${w - s},${h} 0,${h}`} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)} />
    }, ctx),

  subprocess: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => (
      <g fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)}>
        <rect width={w} height={h} rx={3} />
        <line x1={12} y1={0} x2={12} y2={h} />
        <line x1={w - 12} y1={0} x2={w - 12} y2={h} />
      </g>
    ), ctx),

  cylinder: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => {
      const ry = Math.min(12, h * 0.18)
      return (
        <g fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)}>
          <path d={`M0,${ry} A${w / 2},${ry} 0 0 1 ${w},${ry} L${w},${h - ry} A${w / 2},${ry} 0 0 1 0,${h - ry} Z`} />
          <path d={`M0,${ry} A${w / 2},${ry} 0 0 0 ${w},${ry}`} fill="none" />
        </g>
      )
    }, ctx, { textPad: 10 }),

  document: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => {
      const dy = h * 0.14
      return (
        <path
          d={`M0,0 L${w},0 L${w},${h - dy} Q ${w * 0.75},${h + dy} ${w * 0.5},${h - dy} T 0,${h - dy} Z`}
          fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)}
        />
      )
    }, ctx, { textPad: 8 }),

  circle: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)} />, ctx),

  doubleCircle: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => (
      <g fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)}>
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} />
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 6} ry={h / 2 - 6} fill="none" />
      </g>
    ), ctx),

  note: (n: DiagramNode, ctx: ShapeRenderContext) =>
    svgShell(n, (w, h) => {
      const f = Math.min(14, w * 0.15)
      return (
        <g stroke="var(--node-stroke)" strokeWidth={sw(n)} strokeDasharray={dash(n)}>
          <path d={`M0,0 L${w - f},0 L${w},${f} L${w},${h} L0,${h} Z`} fill="var(--node-fill)" />
          <path d={`M${w - f},0 L${w - f},${f} L${w},${f}`} fill="none" />
        </g>
      )
    }, ctx),
}
