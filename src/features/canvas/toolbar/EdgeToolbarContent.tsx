// 连线工具条：线型（曲线/折线/直线）· 终点箭头 · 虚线 · 标注 · ER 两端基数 · 删除。
import { ArrowRight, Minus, Spline, Trash2, Type, Waypoints } from 'lucide-react'
import { patchEdge } from '@/core/commands/ops'
import { emit, EV } from '@/core/events'
import type { Cardinality, DiagramEdge, EdgeRouting } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { useCanvasStore } from '../canvasStore'
import { PopButton } from './parts'

const t = zh.toolbar
const CARDS: Cardinality[] = ['1', '0..1', 'N', '0..N']
const ROUTES: Array<[EdgeRouting, string, React.ReactNode]> = [
  ['bezier', t.routingBezier, <Spline key="b" size={16} />],
  ['step', t.routingStep, <Waypoints key="s" size={16} />],
  ['straight', t.routingStraight, <Minus key="l" size={16} />],
]

function CardPicker({ edge, side }: { edge: DiagramEdge; side: 'source' | 'target' }) {
  const execute = useDocumentStore((s) => s.execute)
  const value = edge.cardinality?.[side] ?? '1'
  const label = side === 'source' ? t.cardSource : t.cardTarget
  const pick = (v: Cardinality) =>
    execute(
      patchEdge(edge.id, {
        cardinality: { source: '1', target: '1', ...edge.cardinality, [side]: v },
      }),
    )
  return (
    <PopButton label={label} icon={<span className="ds-card-chip">{value}</span>}>
      <p className="ds-pop-title">{label}</p>
      <div className="ds-card-list" role="listbox" aria-label={label}>
        {CARDS.map((c) => (
          <button
            key={c}
            type="button"
            role="option"
            aria-selected={value === c}
            className={`ds-menu-item${value === c ? ' is-current' : ''}`}
            onClick={() => pick(c)}
          >
            {t.cardNames[c]}
          </button>
        ))}
      </div>
    </PopButton>
  )
}

export function EdgeToolbarContent({ edge }: { edge: DiagramEdge }) {
  const execute = useDocumentStore((s) => s.execute)
  const hasCard = useDocumentStore((s) => getPlugin(s.doc.type).edgeFields === 'cardinality')
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const patch = (p: Partial<DiagramEdge>) => execute(patchEdge(edge.id, p))
  return (
    <div className="ds-float ds-toolbar nodrag nopan" role="toolbar" aria-label={t.label}>
      {ROUTES.map(([r, label, icon]) => (
        <IconButton
          key={r}
          icon={icon}
          label={label}
          tipSide="top"
          active={edge.routing === r}
          onClick={() => patch({ routing: r })}
        />
      ))}
      <span className="ds-sep" />
      <IconButton
        icon={<ArrowRight size={16} />}
        label={t.arrowEnd}
        tipSide="top"
        aria-pressed={edge.arrowEnd === 'arrow'}
        onClick={() => patch({ arrowEnd: edge.arrowEnd === 'arrow' ? 'none' : 'arrow' })}
      />
      <IconButton
        icon={<span className="ds-dash-icon" aria-hidden />}
        label={t.dashed}
        tipSide="top"
        aria-pressed={edge.style.dash === 'dashed'}
        onClick={() =>
          patch({
            style: { ...edge.style, dash: edge.style.dash === 'dashed' ? 'solid' : 'dashed' },
          })
        }
      />
      <IconButton
        icon={<Type size={16} />}
        label={t.edgeLabel}
        tipSide="top"
        onClick={() => setEditingEdge(edge.id)}
      />
      {hasCard && (
        <>
          <span className="ds-sep" />
          <CardPicker edge={edge} side="source" />
          <CardPicker edge={edge} side="target" />
        </>
      )}
      <span className="ds-sep" />
      <IconButton
        icon={<Trash2 size={16} />}
        label={t.delete}
        kbd="Del"
        tipSide="top"
        danger
        onClick={() => emit(EV.DELETE)}
      />
    </div>
  )
}
