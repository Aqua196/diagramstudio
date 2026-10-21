// 连线的附属部件：起止箭头 marker、中点标注（双击编辑；自绘时延后浮现，退场时随线淡出）。
import { useState } from 'react'
import { patchEdge } from '@/core/commands/ops'
import type { FlowEdgeData } from '@/store/selectors'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { useCanvasStore } from './canvasStore'
import type { EdgeFxStyle } from './motion/canvasMotion'

export function ArrowDefs({
  id,
  stroke,
  start,
  end,
}: {
  id: string
  stroke: string
  start: boolean
  end: boolean
}) {
  const marker = (mid: string) => (
    <marker
      id={mid}
      viewBox="0 0 10 10"
      refX="8.5"
      refY="5"
      markerWidth="8"
      markerHeight="8"
      orient="auto-start-reverse"
    >
      <path d="M1,1.2 L9,5 L1,8.8 L2.6,5 z" fill={stroke} />
    </marker>
  )
  return (
    <defs>
      {start ? marker(`ds-m-start-${id}`) : null}
      {end ? marker(`ds-m-end-${id}`) : null}
    </defs>
  )
}

export function EdgeLabel({
  id,
  edge,
  labelX,
  labelY,
  selected,
  fx,
  leaving,
}: {
  id: string
  edge: FlowEdgeData['edge']
  labelX: number
  labelY: number
  selected: boolean
  /** 连线正在自绘：标注等线画到一半再浮现 */
  fx?: EdgeFxStyle
  /** 连线是退场残影：标注随线一起淡出 */
  leaving?: boolean
}) {
  const editing = useCanvasStore((s) => s.editingEdgeId === id)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const execute = useDocumentStore((s) => s.execute)
  const [draft, setDraft] = useState('')
  const commitLabel = () => {
    execute(patchEdge(id, { label: draft.trim() || undefined }, '编辑标注'))
    setEditingEdge(null)
  }
  if (!editing && !edge.label) return null
  return (
    <div
      className={[
        'ds-edge-label nopan',
        selected && 'is-selected',
        editing && 'is-editing',
        fx?.['--ds-dur'] && 'is-drawing',
        leaving && 'is-leaving',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...fx, transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setDraft(edge.label ?? '')
        setEditingEdge(id)
      }}
    >
      {editing ? (
        <input
          className="ds-edge-label-input"
          value={draft}
          autoFocus
          placeholder={zh.toolbar.edgeLabelPlaceholder}
          aria-label={zh.toolbar.edgeLabel}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitLabel()
            if (e.key === 'Escape') setEditingEdge(null)
            e.stopPropagation()
          }}
        />
      ) : (
        edge.label
      )}
    </div>
  )
}
