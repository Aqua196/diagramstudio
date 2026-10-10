// 模板缩略示意（C1 从 HomePage 拆出）：把模板文档节点/连线缩比画成 SVG；无节点画通用轮廓。
import type { DiagramType } from '@/core/model/types'
import type { DiagramDoc } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'

const W = 220
const H = 96

function EmptyThumb() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ds-thumb" aria-hidden>
      <rect x={16} y={34} width={56} height={26} rx={2} className="ds-thumb-node" />
      <rect x={140} y={18} width={56} height={26} rx={2} className="ds-thumb-node" />
      <polygon points="168,52 192,66 168,80 144,66" className="ds-thumb-node" />
      <line x1={72} y1={44} x2={140} y2={31} className="ds-thumb-edge" />
      <line x1={72} y1={50} x2={144} y2={66} className="ds-thumb-edge" />
    </svg>
  )
}

function DocThumb({ doc }: { doc: DiagramDoc }) {
  const nodes = Object.values(doc.nodes)
  const edges = Object.values(doc.edges)
  const minX = Math.min(...nodes.map((n) => n.position.x))
  const minY = Math.min(...nodes.map((n) => n.position.y))
  const maxX = Math.max(...nodes.map((n) => n.position.x + n.size.w))
  const maxY = Math.max(...nodes.map((n) => n.position.y + n.size.h))
  const s = Math.min((W - 16) / Math.max(1, maxX - minX), (H - 16) / Math.max(1, maxY - minY))
  const tx = (v: number) => 8 + (v - minX) * s
  const ty = (v: number) => 8 + (v - minY) * s
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ds-thumb" aria-hidden>
      {edges.map((e) => {
        const a = doc.nodes[e.source]
        const b = doc.nodes[e.target]
        if (!a || !b) return null
        return (
          <line
            key={e.id}
            x1={tx(a.position.x + a.size.w / 2)}
            y1={ty(a.position.y + a.size.h / 2)}
            x2={tx(b.position.x + b.size.w / 2)}
            y2={ty(b.position.y + b.size.h / 2)}
            className="ds-thumb-edge"
          />
        )
      })}
      {nodes.map((n) => (
        <rect
          key={n.id}
          x={tx(n.position.x)}
          y={ty(n.position.y)}
          width={Math.max(3, n.size.w * s)}
          height={Math.max(3, n.size.h * s)}
          rx={1.5}
          className="ds-thumb-node"
        />
      ))}
    </svg>
  )
}

export function Thumb({ type }: { type: DiagramType }) {
  const doc = getPlugin(type).templates[0]
  if (!doc || Object.keys(doc.nodes).length === 0) return <EmptyThumb />
  return <DocThumb doc={doc} />
}
