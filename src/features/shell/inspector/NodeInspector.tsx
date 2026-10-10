// 节点检查器：文字/填充/描边/字号 + 几何 + 排列（C1 从 Inspector.tsx 拆出）。
import { patchNode, patchNodeStyle } from '@/core/commands/ops'
import { isNodeColorKey, NODE_COLORS, type NodeColorKey } from '@/core/palette'
import type { DiagramNode } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { NumberField } from '@/components/NumberField'
import { ArrangeSection } from './ArrangeSection'
import { Row, Section, Toggle } from './parts'

const t = zh.inspector

type Patch = (p: Parameters<typeof patchNode>[1], label: string) => void
type PatchStyle = (p: Parameters<typeof patchNodeStyle>[1], label: string) => void

function FillChips({ node, patchStyle }: { node: DiagramNode; patchStyle: PatchStyle }) {
  return (
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
  )
}

function StyleFields({ node, patch, patchStyle }: { node: DiagramNode; patch: Patch; patchStyle: PatchStyle }) {
  return (
    <>
      <Row label={t.text}>
        <input
          className="ds-input"
          value={node.text}
          aria-label={t.text}
          onChange={(e) => patch({ text: e.target.value }, '编辑文字')}
        />
      </Row>
      <Row label={t.fill}>
        <FillChips node={node} patchStyle={patchStyle} />
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
    </>
  )
}

function GeomFields({ node, patch }: { node: DiagramNode; patch: Patch }) {
  return (
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
  )
}

export function NodeInspector({ ids }: { ids: string[] }) {
  const doc = useDocumentStore((s) => s.doc)
  const execute = useDocumentStore((s) => s.execute)
  const node = doc.nodes[ids[0]]
  if (!node) return null
  const patch: Patch = (p, label) => execute(patchNode(node.id, p, label))
  const patchStyle: PatchStyle = (p, label) => execute(patchNodeStyle(node.id, p, label))
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
        <StyleFields node={node} patch={patch} patchStyle={patchStyle} />
      </Section>
      <Section
        title={t.geomSection}
        summary={`${Math.round(node.size.w)}×${Math.round(node.size.h)} · ${Math.round(node.position.x)},${Math.round(node.position.y)}`}
      >
        <GeomFields node={node} patch={patch} />
      </Section>
      <Section title={t.arrangeSection}>
        <ArrangeSection nodeCount={ids.length} />
      </Section>
    </>
  )
}

export function MultiInspector({ count }: { count: number }) {
  return (
    <Section title={t.multiSection} summary={`${count} ${t.selectedElements}`}>
      <ArrangeSection nodeCount={count} />
    </Section>
  )
}
