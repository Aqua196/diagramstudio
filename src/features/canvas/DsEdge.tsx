// 自定义边 'dsEdge'：bezier/step/straight 三种路由、起止箭头、虚线/粗细、
// 中点标注与双击编辑；重连走 onReconnect → reconnectEdge 命令。
import { memo, useMemo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react'
import { patchEdge } from '@/core/commands/ops'
import type { FlowEdgeData } from '@/store/selectors'
import { useDocumentStore } from '@/store/documentStore'
import { useCanvasStore } from './canvasStore'
import { resolveEdgeStroke } from './color'
import { zh } from '@/i18n/zh'

function pathFor(
  routing: string,
  p: {
    sourceX: number
    sourceY: number
    targetX: number
    targetY: number
    sourcePosition: EdgeProps['sourcePosition']
    targetPosition: EdgeProps['targetPosition']
  },
): [string, number, number] {
  const r =
    routing === 'step'
      ? getSmoothStepPath({ ...p, borderRadius: 0 })
      : routing === 'straight'
        ? getStraightPath(p)
        : getBezierPath(p)
  return [r[0], r[1], r[2]]
}

function ArrowDefs({
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
      refX="8"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" fill={stroke} />
    </marker>
  )
  return (
    <defs>
      {start ? marker(`ds-m-start-${id}`) : null}
      {end ? marker(`ds-m-end-${id}`) : null}
    </defs>
  )
}

function DsEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  interactionWidth,
}: EdgeProps) {
  const { edge } = data as FlowEdgeData
  const editing = useCanvasStore((s) => s.editingEdgeId === id)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const execute = useDocumentStore((s) => s.execute)
  const [draft, setDraft] = useState('')

  const [path, labelX, labelY] = useMemo(
    () =>
      pathFor(edge.routing, { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }),
    [edge.routing, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition],
  )

  const stroke = selected ? 'var(--accent)' : resolveEdgeStroke(edge.style.stroke)
  const arrowStart = edge.arrowStart === 'arrow'
  const arrowEnd = edge.arrowEnd === 'arrow'

  const commitLabel = () => {
    execute(patchEdge(id, { label: draft.trim() || undefined }, '编辑标注'))
    setEditingEdge(null)
  }

  return (
    <>
      <ArrowDefs id={id} stroke={stroke} start={arrowStart} end={arrowEnd} />
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={interactionWidth ?? 20}
        style={{
          stroke,
          strokeWidth: edge.style.strokeWidth + (selected ? 0.5 : 0),
          strokeDasharray: edge.style.dash === 'dashed' ? '7 5' : undefined,
        }}
        markerStart={arrowStart ? `url(#ds-m-start-${id})` : undefined}
        markerEnd={arrowEnd ? `url(#ds-m-end-${id})` : undefined}
      />
      <EdgeLabelRenderer>
        <div
          className={`ds-edge-label${selected ? ' is-selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
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
              placeholder={zh.canvas.textPlaceholder}
              aria-label={zh.inspector.edgeLabel}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') setEditingEdge(null)
                e.stopPropagation()
              }}
            />
          ) : (
            (edge.label ?? '')
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(DsEdge, (prev, next) => {
  const a = prev.data as FlowEdgeData
  const b = next.data as FlowEdgeData
  return (
    a.edge === b.edge &&
    prev.selected === next.selected &&
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.sourcePosition === next.sourcePosition &&
    prev.targetPosition === next.targetPosition
  )
})
