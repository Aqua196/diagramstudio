// 三个插件共享的 SVG 渲染件：颜色一律用画布注入的 --node-* 变量。
// 外壳（svgShell）负责尺寸与文字位，具体几何在 shapePaths.tsx。
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
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      {body(w, h)}
      <foreignObject x={pad} y={pad} width={w - pad * 2} height={h - pad * 2}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              node.style.align === 'left'
                ? 'flex-start'
                : node.style.align === 'right'
                  ? 'flex-end'
                  : 'center',
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
