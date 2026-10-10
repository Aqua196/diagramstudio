// 连线检查器：路由/箭头/虚线/描边/标签/ER 基数（C1 从 Inspector.tsx 拆出）。
import { patchEdge } from '@/core/commands/ops'
import type { Cardinality, DiagramEdge } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { NumberField } from '@/components/NumberField'
import { Row, Section, Toggle } from './parts'

const t = zh.inspector
const CARDS: Cardinality[] = ['1', '0..1', 'N', '0..N']

function CardSelect({
  value,
  onChange,
  label,
}: {
  value: Cardinality
  onChange: (v: Cardinality) => void
  label: string
}) {
  return (
    <select
      className="ds-input"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value as Cardinality)}
    >
      {CARDS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

type Patch = (p: Parameters<typeof patchEdge>[1]) => void

function RoutingRow({ edge, patch }: { edge: DiagramEdge; patch: Patch }) {
  return (
    <Row label={t.routing}>
      <div className="ds-segment">
        {(
          [
            ['bezier', t.routingBezier],
            ['step', t.routingStep],
            ['straight', t.routingStraight],
          ] as const
        ).map(([r, label]) => (
          <button
            key={r}
            type="button"
            className={`ds-segment-btn${edge.routing === r ? ' is-active' : ''}`}
            onClick={() => patch({ routing: r })}
          >
            {label}
          </button>
        ))}
      </div>
    </Row>
  )
}

function StyleRows({ edge, patch }: { edge: DiagramEdge; patch: Patch }) {
  return (
    <>
      <RoutingRow edge={edge} patch={patch} />
      <Toggle
        label={t.arrowStart}
        checked={edge.arrowStart === 'arrow'}
        onChange={(v) => patch({ arrowStart: v ? 'arrow' : 'none' })}
      />
      <Toggle
        label={t.arrowEnd}
        checked={edge.arrowEnd === 'arrow'}
        onChange={(v) => patch({ arrowEnd: v ? 'arrow' : 'none' })}
      />
      <Toggle
        label={t.dashed}
        checked={edge.style.dash === 'dashed'}
        onChange={(v) => patch({ style: { ...edge.style, dash: v ? 'dashed' : 'solid' } })}
      />
      <div className="ds-grid-2">
        <NumberField
          label={t.strokeWidth}
          value={edge.style.strokeWidth}
          min={0.5}
          max={8}
          step={0.5}
          onCommit={(v) => patch({ style: { ...edge.style, strokeWidth: v } })}
        />
      </div>
      <Row label={t.edgeLabel}>
        <input
          className="ds-input"
          value={edge.label ?? ''}
          aria-label={t.edgeLabel}
          onChange={(e) => patch({ label: e.target.value || undefined })}
        />
      </Row>
    </>
  )
}

export function EdgeInspector({ ids }: { ids: string[] }) {
  const doc = useDocumentStore((s) => s.doc)
  const execute = useDocumentStore((s) => s.execute)
  const plugin = getPlugin(doc.type)
  const edge = doc.edges[ids[0]]
  if (!edge) return null
  const patch: Patch = (p) => execute(patchEdge(edge.id, p))
  const card = (side: 'source' | 'target', v: Cardinality) =>
    patch({ cardinality: { source: '1', target: '1', ...edge.cardinality, [side]: v } })
  const routingName =
    edge.routing === 'bezier' ? t.routingBezier : edge.routing === 'step' ? t.routingStep : t.routingStraight
  return (
    <Section title={t.edgeSection} summary={routingName}>
      <StyleRows edge={edge} patch={patch} />
      {plugin.edgeFields === 'cardinality' && (
        <>
          <Row label={t.cardSource}>
            <CardSelect
              value={edge.cardinality?.source ?? '1'}
              onChange={(v) => card('source', v)}
              label={t.cardSource}
            />
          </Row>
          <Row label={t.cardTarget}>
            <CardSelect
              value={edge.cardinality?.target ?? '1'}
              onChange={(v) => card('target', v)}
              label={t.cardTarget}
            />
          </Row>
        </>
      )}
    </Section>
  )
}
