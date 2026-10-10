// 右侧检查器 280px：随 selection 切换画布设置 / 节点 / 连线 / 多选面板。
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { patchEdge, patchNode, patchNodeStyle, setSettings } from '@/core/commands/ops'
import { isNodeColorKey, NODE_COLORS, type NodeColorKey } from '@/core/palette'
import type { AlignMode } from '@/core/commands/ops'
import type { Cardinality } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { selectSelectedEdges, selectSelectedNodes } from '@/store/selectors'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { NumberField } from '@/components/NumberField'

const t = zh.inspector

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ds-field-row">
      <span className="ds-field-label">{label}</span>
      <div className="ds-field-body">{children}</div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="ds-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function Section({
  title,
  summary,
  children,
}: {
  title: string
  summary?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="ds-group">
      <button
        type="button"
        className="ds-group-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ds-group-title">{title}</span>
        {summary && <span className="ds-group-sum">{summary}</span>}
        <ChevronDown size={13} className={`ds-group-chevron${open ? ' is-open' : ''}`} />
      </button>
      {open && <div className="ds-panel-body">{children}</div>}
    </section>
  )
}

function CanvasSettings() {
  const settings = useDocumentStore((s) => s.doc.settings)
  const execute = useDocumentStore((s) => s.execute)
  const minimapVisible = useUiStore((s) => s.minimapVisible)
  const setMinimapVisible = useUiStore((s) => s.setMinimapVisible)
  const onoff = (v: boolean) => (v ? '开' : '关')
  return (
    <Section
      title={t.canvasSettings}
      summary={`${t.grid}${onoff(settings.grid)}·${t.snap}${onoff(settings.snap)}`}
    >
        <Toggle
          label={t.grid}
          checked={settings.grid}
          onChange={(v) => execute(setSettings({ grid: v }))}
        />
        <Toggle
          label={t.snap}
          checked={settings.snap}
          onChange={(v) => execute(setSettings({ snap: v }))}
        />
        <Toggle label={t.minimap} checked={minimapVisible} onChange={setMinimapVisible} />
        <Row label={t.direction}>
          <div className="ds-segment">
            {(['TB', 'LR'] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`ds-segment-btn${settings.layoutDirection === d ? ' is-active' : ''}`}
                onClick={() => execute(setSettings({ layoutDirection: d }, t.direction))}
              >
                {d === 'TB' ? t.dirTB : t.dirLR}
              </button>
            ))}
          </div>
        </Row>
        <button
          type="button"
          className="ds-btn ds-btn-wide"
          onClick={() => emit(EV.AUTO_LAYOUT, settings.layoutDirection)}
        >
          {t.autoLayout}
        </button>
    </Section>
  )
}

function NodeInspector({ ids }: { ids: string[] }) {
  const doc = useDocumentStore((s) => s.doc)
  const execute = useDocumentStore((s) => s.execute)
  const node = doc.nodes[ids[0]]
  if (!node) return null
  const patch = (p: Parameters<typeof patchNode>[1], label: string) =>
    execute(patchNode(node.id, p, label))
  const patchStyle = (p: Parameters<typeof patchNodeStyle>[1], label: string) =>
    execute(patchNodeStyle(node.id, p, label))
  return (
    <>
      <Section
        title={t.nodeSection}
        summary={
          node.text
            ? node.text.slice(0, 8)
            : isNodeColorKey(node.style.fill)
              ? NODE_COLORS[node.style.fill].name
              : undefined
        }
      >
        <Row label={t.text}>
          <input
            className="ds-input"
            value={node.text}
            aria-label={t.text}
            onChange={(e) => patch({ text: e.target.value }, '编辑文字')}
          />
        </Row>
        <Row label={t.fill}>
          <div className="ds-chips" role="group" aria-label={t.fill}>
            {(Object.keys(NODE_COLORS) as NodeColorKey[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`ds-chip${node.style.fill === k ? ' is-active' : ''}`}
                style={{ background: NODE_COLORS[k].light }}
                title={NODE_COLORS[k].name}
                aria-label={NODE_COLORS[k].name}
                onClick={() => patchStyle({ fill: k }, '修改填充')}
              />
            ))}
          </div>
        </Row>
        <div className="ds-grid-2">
          <NumberField
            label={t.strokeWidth}
            value={node.style.strokeWidth}
            min={0.5}
            max={8}
            step={0.5}
            onCommit={(v) => patchStyle({ strokeWidth: v }, '修改描边')}
          />
          <NumberField
            label={t.fontSize}
            value={node.style.fontSize}
            min={8}
            max={48}
            onCommit={(v) => patchStyle({ fontSize: v }, '修改字号')}
          />
        </div>
        <Toggle
          label={t.bold}
          checked={node.style.bold}
          onChange={(v) => patchStyle({ bold: v }, '修改样式')}
        />
      </Section>
      <Section
        title={t.geomSection}
        summary={`${Math.round(node.size.w)}×${Math.round(node.size.h)} · ${Math.round(node.position.x)},${Math.round(node.position.y)}`}
      >
        <div className="ds-grid-2">
          <NumberField
            label={t.posX}
            value={node.position.x}
            onCommit={(v) => patch({ position: { ...node.position, x: v } }, '移动元素')}
          />
          <NumberField
            label={t.posY}
            value={node.position.y}
            onCommit={(v) => patch({ position: { ...node.position, y: v } }, '移动元素')}
          />
          <NumberField
            label={t.sizeW}
            value={node.size.w}
            min={8}
            onCommit={(v) => patch({ size: { ...node.size, w: v } }, '调整大小')}
          />
          <NumberField
            label={t.sizeH}
            value={node.size.h}
            min={8}
            onCommit={(v) => patch({ size: { ...node.size, h: v } }, '调整大小')}
          />
        </div>
      </Section>
      <Section title={t.arrangeSection}>
        <ArrangeSection nodeCount={ids.length} />
      </Section>
    </>
  )
}

function ArrangeSection({ nodeCount }: { nodeCount: number }) {
  const align = (m: AlignMode) => emit(EV.ALIGN, m)
  return (
    <>
      <div className="ds-field-label ds-group-label">{t.zGroup}</div>
      <div className="ds-btn-row">
        <button
          type="button"
          className="ds-btn"
          disabled={nodeCount === 0}
          onClick={() => emit(EV.Z_FRONT)}
        >
          {t.zFront}
        </button>
        <button
          type="button"
          className="ds-btn"
          disabled={nodeCount === 0}
          onClick={() => emit(EV.Z_BACK)}
        >
          {t.zBack}
        </button>
      </div>
      <div className="ds-field-label ds-group-label">{t.alignGroup}</div>
      <div className="ds-btn-grid" role="group" aria-label={t.alignGroup}>
        {(
          [
            ['left', t.alignLeft],
            ['center', t.alignHCenter],
            ['right', t.alignRight],
            ['top', t.alignTop],
            ['middle', t.alignVCenter],
            ['bottom', t.alignBottom],
          ] as Array<[AlignMode, string]>
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            className="ds-btn"
            disabled={nodeCount < 2}
            title={nodeCount < 2 ? t.needTwo : label}
            onClick={() => align(m)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ds-field-label ds-group-label">{t.distributeGroup}</div>
      <div className="ds-btn-row">
        <button
          type="button"
          className="ds-btn"
          disabled={nodeCount < 3}
          title={nodeCount < 3 ? t.needThree : t.distH}
          onClick={() => emit(EV.DISTRIBUTE, 'h')}
        >
          {t.distH}
        </button>
        <button
          type="button"
          className="ds-btn"
          disabled={nodeCount < 3}
          title={nodeCount < 3 ? t.needThree : t.distV}
          onClick={() => emit(EV.DISTRIBUTE, 'v')}
        >
          {t.distV}
        </button>
      </div>
    </>
  )
}

function MultiInspector({ count }: { count: number }) {
  return (
    <Section title={t.multiSection} summary={`${count} ${t.selectedElements}`}>
      <ArrangeSection nodeCount={count} />
    </Section>
  )
}

const CARDS: Cardinality[] = ['1', '0..1', 'N', '0..N']

function EdgeInspector({ ids }: { ids: string[] }) {
  const doc = useDocumentStore((s) => s.doc)
  const execute = useDocumentStore((s) => s.execute)
  const plugin = getPlugin(doc.type)
  const edge = doc.edges[ids[0]]
  if (!edge) return null
  const patch = (p: Parameters<typeof patchEdge>[1]) => execute(patchEdge(edge.id, p))
  const card = (side: 'source' | 'target', v: Cardinality) =>
    patch({ cardinality: { source: '1', target: '1', ...edge.cardinality, [side]: v } })
  const routingName =
    edge.routing === 'bezier' ? t.routingBezier : edge.routing === 'step' ? t.routingStep : t.routingStraight
  return (
    <Section title={t.edgeSection} summary={routingName}>
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

export function Inspector() {
  const doc = useDocumentStore((s) => s.doc)
  const sel = useUiStore((s) => s.selection)
  const nodes = selectSelectedNodes(doc, sel)
  const edges = selectSelectedEdges(doc, sel)
  return (
    <aside className="ds-panel ds-panel-right" aria-label={zh.topbar.rightPanel}>
      {nodes.length === 1 && edges.length === 0 && <NodeInspector ids={sel.nodeIds} />}
      {nodes.length > 1 && <MultiInspector count={nodes.length} />}
      {nodes.length === 0 && edges.length >= 1 && <EdgeInspector ids={sel.edgeIds} />}
      {nodes.length === 0 && edges.length === 0 && <CanvasSettings />}
    </aside>
  )
}
