// ER 鸟脚基数（B5）：DsEdge 检测到 edge.cardinality 即在两端绘制符号。
// 数据驱动，不判断图类型；方向由连接线端点的 Position 推出。
import { Position } from '@xyflow/react'
import type { Cardinality } from '@/core/model/types'
import { zh } from '@/i18n/zh'

/** 端点 Position → 「指向节点内部」的角度（鸟脚朝节点张开） */
const TOWARD_NODE: Record<Position, number> = {
  [Position.Right]: 180,
  [Position.Left]: 0,
  [Position.Top]: 90,
  [Position.Bottom]: -90,
}

interface FeetProps {
  x: number
  y: number
  position: Position
  card: Cardinality
  stroke: string
}

/** 单个端点的鸟脚符号：局部坐标 -x 指向节点 */
function Feet({ x, y, position, card, stroke }: FeetProps) {
  const angle = TOWARD_NODE[position]
  const parts: string[] = []
  // 从节点向外：'1' 双竖线、'0' 小圆、'N' 三叉爪；端点旁补小号文字
  if (card === '1') {
    parts.push('M-2,-6 L-2,6', 'M-7,-6 L-7,6')
  } else if (card === '0..1') {
    parts.push('M-11,-6 L-11,6')
  } else if (card === 'N') {
    parts.push('M-11,0 L0,-7', 'M-11,0 L0,0', 'M-11,0 L0,7')
  } else {
    parts.push('M-15,0 L-4,-7', 'M-15,0 L-4,0', 'M-15,0 L-4,7')
  }
  const hasCircle = card === '0..1' || card === '0..N'
  const circleCx = card === '0..1' ? -4 : -8
  return (
    <g
      transform={`translate(${x},${y}) rotate(${angle})`}
      role="img"
      aria-label={`${zh.canvas.cardAria} ${card}`}
    >
      <g stroke={stroke} strokeWidth={1.5} fill="none">
        {parts.map((d) => (
          <path key={d} d={d} />
        ))}
        {hasCircle && <circle cx={circleCx} cy={0} r={3} fill="var(--panel)" />}
      </g>
      <text
        x={-30}
        y={-8}
        fontSize={9}
        fill="var(--ink-3)"
        transform={`rotate(${-angle} ${-30} -8)`}
      >
        {card}
      </text>
    </g>
  )
}

export function CrowsFeet({
  card,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  stroke,
}: {
  card: { source: Cardinality; target: Cardinality }
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  stroke: string
}) {
  // 鸟脚稍微缩进线内，避免盖住节点边框
  const inset = (x: number, y: number, p: Position, d: number) => {
    const a = (TOWARD_NODE[p] * Math.PI) / 180
    return { x: x - Math.cos(a) * -d, y: y - Math.sin(a) * -d }
  }
  const s = inset(sourceX, sourceY, sourcePosition, -14)
  const t = inset(targetX, targetY, targetPosition, -14)
  return (
    <>
      <Feet x={s.x} y={s.y} position={sourcePosition} card={card.source} stroke={stroke} />
      <Feet x={t.x} y={t.y} position={targetPosition} card={card.target} stroke={stroke} />
    </>
  )
}
