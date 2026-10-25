// 流程图形状目录：每个形状只描述几何；填充、描边、线宽、虚线由外层 <g> 统一给出（这几个 SVG 属性会继承），
// 改描边样式只需改一处，形状之间也不会各写各的漏掉某个属性。
import type { ReactNode } from 'react'
import type { DiagramNode } from '@/core/model/types'
import type { ShapeRenderContext } from '@/core/plugin'
import { svgShell } from './shapekit'

type Body = (w: number, h: number) => ReactNode
type Render = (n: DiagramNode, ctx: ShapeRenderContext) => ReactNode

/** 几何 → 完整形状；textPad 是文字位离边框的距离（菱形、圆柱这类要让出斜边/弧顶） */
function shape(body: Body, textPad?: number): Render {
  return (n, ctx) =>
    svgShell(
      n,
      (w, h) => (
        <g
          fill="var(--node-fill)"
          stroke="var(--node-stroke)"
          strokeWidth={n.style.strokeWidth}
          strokeDasharray={n.style.dash === 'dashed' ? '6 4' : undefined}
        >
          {body(w, h)}
        </g>
      ),
      ctx,
      textPad === undefined ? undefined : { textPad },
    )
}

export const shapePaths = {
  rect: shape((w, h) => <rect width={w} height={h} rx={Math.min(8, h / 4)} />),

  rounded: shape((w, h) => <rect width={w} height={h} rx={h / 2} />),

  diamond: shape(
    (w, h) => <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} />,
    22,
  ),

  parallelogram: shape((w, h) => {
    const s = Math.min(20, w * 0.18)
    return <polygon points={`${s},0 ${w},0 ${w - s},${h} 0,${h}`} />
  }),

  subprocess: shape((w, h) => (
    <>
      <rect width={w} height={h} rx={3} />
      <line x1={12} y1={0} x2={12} y2={h} />
      <line x1={w - 12} y1={0} x2={w - 12} y2={h} />
    </>
  )),

  cylinder: shape((w, h) => {
    const ry = Math.min(12, h * 0.18)
    const top = `M0,${ry} A${w / 2},${ry} 0 0 1 ${w},${ry}`
    return (
      <>
        <path d={`${top} L${w},${h - ry} A${w / 2},${ry} 0 0 1 0,${h - ry} Z`} />
        <path d={`M0,${ry} A${w / 2},${ry} 0 0 0 ${w},${ry}`} fill="none" />
      </>
    )
  }, 10),

  document: shape((w, h) => {
    const dy = h * 0.14
    const wave = `Q ${w * 0.75},${h + dy} ${w * 0.5},${h - dy} T 0,${h - dy}`
    return <path d={`M0,0 L${w},0 L${w},${h - dy} ${wave} Z`} />
  }, 8),

  circle: shape((w, h) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} />),

  doubleCircle: shape((w, h) => (
    <>
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} />
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 6} ry={h / 2 - 6} fill="none" />
    </>
  )),

  note: shape((w, h) => {
    const f = Math.min(14, w * 0.15)
    return (
      <>
        <path d={`M0,0 L${w - f},0 L${w},${f} L${w},${h} L0,${h} Z`} />
        <path d={`M${w - f},0 L${w - f},${f} L${w},${f}`} fill="none" />
      </>
    )
  }),
}
