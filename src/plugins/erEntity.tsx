// ER 实体节点渲染：表头 + 字段行（PK/FK 按钮、行内输入、删除、拖柄排序）。
// 颜色一律用画布注入的 --node-* 变量；命令经 ctx.dispatch 提交。
import { useRef, useState, type ReactNode } from 'react'
import { patchNode } from '@/core/commands/ops'
import { createId } from '@/core/model/factories'
import type { DiagramNode, ErField } from '@/core/model/types'
import type { ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'

const er = zh.plugins.er
export const ROW_H = 26
export const HEAD_H = 30

const fieldsOf = (n: DiagramNode): ErField[] => (n.data as { fields?: ErField[] }).fields ?? []

/** 键位循环：无 → PK → FK → 无 */
function nextKey(f: ErField): Partial<ErField> {
  if (f.pk) return { pk: false, fk: true }
  if (f.fk) return { pk: false, fk: false }
  return { pk: true, fk: false }
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [x] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, x)
  return next
}

function FieldRows({ node, ctx }: { node: DiagramNode; ctx: ShapeRenderContext }) {
  const { w } = node.size
  const fields = fieldsOf(node)
  const h = Math.max(node.size.h, HEAD_H + Math.max(1, fields.length) * ROW_H + 4)
  // 拖动排序过程态：dragIdx=被拖行，overIdx=目标插入位；松手才提交命令
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  const startY = useRef(0)

  const update = (next: ErField[], label: string = er.updateField, coalesceKey?: string) =>
    ctx.dispatch(
      patchNode(node.id, { data: { ...node.data, fields: next }, size: { w: node.size.w, h } }, label, coalesceKey),
    )
  const setField = (id: string, patch: Partial<ErField>, key: string, coalesce = false) =>
    update(
      fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      er.updateField,
      coalesce ? `field:${node.id}:${id}:${key}` : undefined,
    )
  const view = drag ? move(fields, drag.from, drag.to) : fields

  return (
    <>
      {view.map((f, i) => {
        const y = HEAD_H + i * ROW_H
        const origIdx = fields.indexOf(f)
        return (
          <g key={f.id}>
            <line x1={0} y1={y} x2={w} y2={y} stroke="var(--node-stroke)" strokeWidth={0.75} opacity={0.4} />
            <foreignObject x={0} y={y} width={16} height={ROW_H}>
              <button
                type="button"
                className="ds-er-grip ds-export-exclude"
                aria-label={er.dragField}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  startY.current = e.clientY
                  setDrag({ from: origIdx, to: origIdx })
                  const onMove = (ev: PointerEvent) => {
                    const to = origIdx + Math.round((ev.clientY - startY.current) / ROW_H)
                    setDrag((d) => (d && d.to !== to ? { from: d.from, to } : d))
                  }
                  const onUp = (ev: PointerEvent) => {
                    window.removeEventListener('pointermove', onMove)
                    window.removeEventListener('pointerup', onUp)
                    const to = origIdx + Math.round((ev.clientY - startY.current) / ROW_H)
                    setDrag(null)
                    if (to !== origIdx) update(move(fields, origIdx, to), er.reorderField)
                  }
                  window.addEventListener('pointermove', onMove)
                  window.addEventListener('pointerup', onUp)
                }}
                onKeyDown={(e) => {
                  if (!e.altKey) return
                  if (e.key === 'ArrowUp' && origIdx > 0) update(move(fields, origIdx, origIdx - 1), er.reorderField)
                  if (e.key === 'ArrowDown' && origIdx < fields.length - 1)
                    update(move(fields, origIdx, origIdx + 1), er.reorderField)
                  e.stopPropagation()
                }}
              >
                ⋮⋮
              </button>
            </foreignObject>
            <foreignObject x={16} y={y} width={30} height={ROW_H}>
              <button
                type="button"
                className="ds-er-key"
                aria-label={er.keyButton}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setField(f.id, nextKey(f), 'key')
                }}
              >
                {f.pk ? 'PK' : f.fk ? 'FK' : ''}
              </button>
            </foreignObject>
            <foreignObject x={46} y={y} width={w - 126} height={ROW_H}>
              <input
                value={f.name}
                aria-label={er.fieldName}
                onChange={(e) => setField(f.id, { name: e.target.value }, 'name', true)}
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
                onChange={(e) => setField(f.id, { type: e.target.value }, 'type', true)}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="ds-er-input ds-er-type"
              />
            </foreignObject>
            <foreignObject x={w - 20} y={y} width={18} height={ROW_H}>
              <button
                type="button"
                className="ds-er-del ds-export-exclude"
                aria-label={er.deleteField}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  update(fields.filter((x) => x.id !== f.id), er.deleteField)
                }}
              >
                ×
              </button>
            </foreignObject>
          </g>
        )
      })}
      <foreignObject x={0} y={HEAD_H + view.length * ROW_H} width={w} height={ROW_H}>
        <button
          type="button"
          className="ds-er-add"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            update(
              [...fields, { id: createId(), name: `field_${fields.length + 1}`, type: 'int' }],
              er.addField,
            )
          }}
        >
          {er.addField}
        </button>
      </foreignObject>
    </>
  )
}

/** 实体渲染：表头 + 字段行；weak=true 时在同一 svg 内画内缩 4px 的第二层边框 */
export function entityRender(
  node: DiagramNode,
  ctx: ShapeRenderContext,
  opts?: { weak?: boolean },
): ReactNode {
  const { w } = node.size
  const fields = fieldsOf(node)
  const h = Math.max(node.size.h, HEAD_H + Math.max(1, fields.length) * ROW_H + 4)
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <rect width={w} height={h} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      {opts?.weak && (
        <rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      )}
      <rect width={w} height={HEAD_H} fill="var(--node-stroke)" opacity={0.16} />
      <line x1={0} y1={HEAD_H} x2={w} y2={HEAD_H} stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      <foreignObject x={0} y={0} width={w} height={HEAD_H}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: node.style.fontSize, fontWeight: 700, color: 'var(--node-text)', overflow: 'hidden', pointerEvents: 'none' }}>
          {ctx.editing ? '' : node.text}
        </div>
      </foreignObject>
      <FieldRows node={node} ctx={ctx} />
    </svg>
  )
}
