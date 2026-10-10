// ER 字段行 UI（C1 从 erEntity 拆出）：PK/FK 按钮、行内输入、删除、拖柄排序。
import { useRef, useState } from 'react'
import { patchNode } from '@/core/commands/ops'
import type { DiagramNode, ErField } from '@/core/model/types'
import type { ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import { AddButton, DelButton, KeyButton } from './erFieldButtons'

const er = zh.plugins.er
export const ROW_H = 26
export const HEAD_H = 30

export const fieldsOf = (n: DiagramNode): ErField[] =>
  (n.data as { fields?: ErField[] }).fields ?? []

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [x] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, x)
  return next
}

interface RowApi {
  setField: (id: string, patch: Partial<ErField>, key: string, coalesce?: boolean) => void
  update: (next: ErField[], label?: string) => void
}

type GripSetDrag = (
  d: { from: number; to: number } | null | ((p: { from: number; to: number } | null) => { from: number; to: number } | null),
) => void

function GripButton({
  origIdx,
  fields,
  api,
  setDrag,
}: {
  origIdx: number
  fields: ErField[]
  api: RowApi
  setDrag: GripSetDrag
}) {
  const startY = useRef(0)
  const down = (e: React.PointerEvent) => {
    e.stopPropagation()
    startY.current = e.clientY
    setDrag({ from: origIdx, to: origIdx })
    const idx = (ev: PointerEvent) => origIdx + Math.round((ev.clientY - startY.current) / ROW_H)
    const onMove = (ev: PointerEvent) =>
      setDrag((d) => (d && d.to !== idx(ev) ? { from: d.from, to: idx(ev) } : d))
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDrag(null)
      const to = idx(ev)
      if (to !== origIdx) api.update(move(fields, origIdx, to), er.reorderField)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  return (
    <button
      type="button"
      className="ds-er-grip ds-export-exclude"
      aria-label={er.dragField}
      onPointerDown={down}
      onKeyDown={(e) => {
        if (!e.altKey) return
        if (e.key === 'ArrowUp' && origIdx > 0)
          api.update(move(fields, origIdx, origIdx - 1), er.reorderField)
        if (e.key === 'ArrowDown' && origIdx < fields.length - 1)
          api.update(move(fields, origIdx, origIdx + 1), er.reorderField)
        e.stopPropagation()
      }}
    >
      ⋮⋮
    </button>
  )
}

function FieldInputs({ f, w, y, api }: { f: ErField; w: number; y: number; api: RowApi }) {
  return (
    <>
      <foreignObject x={46} y={y} width={w - 126} height={ROW_H}>
        <input
          value={f.name}
          aria-label={er.fieldName}
          onChange={(e) => api.setField(f.id, { name: e.target.value }, 'name', true)}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="ds-er-input ds-er-name"
          style={{ fontWeight: f.pk ? 700 : 400, textDecoration: f.pk ? 'underline' : 'none' }}
        />
      </foreignObject>
      <foreignObject x={w - 78} y={y} width={56} height={ROW_H}>
        <input
          value={f.type}
          aria-label={er.fieldType}
          onChange={(e) => api.setField(f.id, { type: e.target.value }, 'type', true)}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="ds-er-input ds-er-type"
        />
      </foreignObject>
    </>
  )
}

function FieldRow({
  f,
  i,
  origIdx,
  w,
  fields,
  api,
  setDrag,
}: {
  f: ErField
  i: number
  origIdx: number
  w: number
  fields: ErField[]
  api: RowApi
  setDrag: GripSetDrag
}) {
  const y = HEAD_H + i * ROW_H
  return (
    <g>
      <line x1={0} y1={y} x2={w} y2={y} stroke="var(--node-stroke)" strokeWidth={0.75} opacity={0.4} />
      <foreignObject x={0} y={y} width={16} height={ROW_H}>
        <GripButton origIdx={origIdx} fields={fields} api={api} setDrag={setDrag} />
      </foreignObject>
      <foreignObject x={16} y={y} width={30} height={ROW_H}>
        <KeyButton f={f} api={api} />
      </foreignObject>
      <FieldInputs f={f} w={w} y={y} api={api} />
      <foreignObject x={w - 20} y={y} width={18} height={ROW_H}>
        <DelButton f={f} fields={fields} api={api} />
      </foreignObject>
    </g>
  )
}

export function FieldRows({ node, ctx }: { node: DiagramNode; ctx: ShapeRenderContext }) {
  const { w } = node.size
  const fields = fieldsOf(node)
  const h = Math.max(node.size.h, HEAD_H + Math.max(1, fields.length) * ROW_H + 4)
  // 拖动排序过程态：drag=被拖行→目标位；松手才提交命令（C1 保留原行为）
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  const update: RowApi['update'] = (next, label = er.updateField) =>
    ctx.dispatch(
      patchNode(node.id, { data: { ...node.data, fields: next }, size: { w: node.size.w, h } }, label),
    )
  const api: RowApi = {
    update,
    setField: (id, patch, key, coalesce = false) =>
      ctx.dispatch(
        patchNode(
          node.id,
          { data: { ...node.data, fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }, size: { w: node.size.w, h } },
          er.updateField,
          coalesce ? `field:${node.id}:${id}:${key}` : undefined,
        ),
      ),
  }
  const view = drag ? move(fields, drag.from, drag.to) : fields
  return (
    <>
      {view.map((f, i) => (
        <FieldRow
          key={f.id}
          f={f}
          i={i}
          origIdx={fields.indexOf(f)}
          w={w}
          fields={fields}
          api={api}
          setDrag={setDrag}
        />
      ))}
      <foreignObject x={0} y={HEAD_H + fields.length * ROW_H} width={w} height={ROW_H}>
        <AddButton fields={fields} api={api} />
      </foreignObject>
    </>
  )
}
