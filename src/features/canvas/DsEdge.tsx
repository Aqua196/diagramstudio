// 自定义边 'dsEdge'：bezier/step/straight 三种路由、起止箭头、虚线/粗细、
// 中点标注与双击编辑；选中单条连线时挂上下文工具条；重连走 onReconnect → reconnectEdge 命令。
import { memo, useMemo, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeToolbar, type EdgeProps } from '@xyflow/react'
import { patchEdge } from '@/core/commands/ops'
import type { FlowEdgeData } from '@/store/selectors'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { useCanvasStore } from './canvasStore'
import { resolveEdgeStroke } from './color'
import { zh } from '@/i18n/zh'
import { CrowsFeet } from './CrowsFoot'
import { pathFor } from './edgePath'
import { EdgeToolbarContent } from './toolbar/EdgeToolbarContent'

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

function EdgeLabel({
  id,
  edge,
  labelX,
  labelY,
  selected,
}: {
  id: string
  edge: FlowEdgeData['edge']
  labelX: number
  labelY: number
  selected: boolean
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
      className={`ds-edge-label nopan${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}`}
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

function DsEdge(p: EdgeProps) {
  const {
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
  } = p
  const { edge } = data as FlowEdgeData
  const theme = useUiStore((s) => s.resolvedTheme)
  const single = useUiStore(
    (s) => s.selection.edgeIds.length === 1 && s.selection.nodeIds.length === 0,
  )
  const editingLabel = useCanvasStore((s) => s.editingEdgeId === id)
  const needLabel = !!edge.label || editingLabel || !!selected
  const [path, labelX, labelY] = useMemo(
    () =>
      pathFor(
        edge.routing,
        { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
        needLabel,
      ),
    [edge.routing, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, needLabel],
  )
  const stroke = selected ? 'var(--accent)' : resolveEdgeStroke(edge.style.stroke, theme)
  const arrowStart = edge.arrowStart === 'arrow'
  const arrowEnd = edge.arrowEnd === 'arrow'
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
          strokeDasharray: edge.style.dash === 'dashed' ? '6 5' : undefined,
          strokeLinecap: 'round',
        }}
        markerStart={arrowStart ? `url(#ds-m-start-${id})` : undefined}
        markerEnd={arrowEnd ? `url(#ds-m-end-${id})` : undefined}
      />
      {edge.cardinality && (
        <CrowsFeet
          card={edge.cardinality}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          stroke={stroke}
        />
      )}
      {/* 性能：EdgeLabelRenderer 每次 RF store 更新都会 querySelector 一次，
          只给真有标注/正在编辑的连线挂载（800 条无标注连线拖拽时省下 800 次 DOM 查询/帧） */}
      {(edge.label || editingLabel) && (
        <EdgeLabelRenderer>
          <EdgeLabel id={id} edge={edge} labelX={labelX} labelY={labelY} selected={!!selected} />
        </EdgeLabelRenderer>
      )}
      {selected && single && !editingLabel && (
        <EdgeToolbar
          edgeId={id}
          x={labelX}
          y={labelY - 22}
          alignY="bottom"
          isVisible
          className="ds-export-exclude"
        >
          <EdgeToolbarContent edge={edge} />
        </EdgeToolbar>
      )}
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
