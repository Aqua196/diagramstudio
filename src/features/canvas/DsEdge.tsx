// 自定义边 'dsEdge'：bezier/step/straight 三种路由、起止箭头、虚线/粗细、
// 中点标注与双击编辑；选中单条连线时挂上下文工具条；重连走 onReconnect → reconnectEdge 命令。
// 动效：edge.style 带 --ds-dur 时沿路径自绘（箭头/鸟脚等画完再出现）；选中单条时一颗光珠沿方向跑一趟；
// data.ghost 为退场残影（随节点收回/淡出，不挂工具条）。
import { memo, useMemo } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeToolbar, type EdgeProps } from '@xyflow/react'
import type { FlowEdgeData } from '@/store/selectors'
import type { EdgeFxStyle } from './motion/canvasMotion'
import { useUiStore } from '@/store/uiStore'
import { useCanvasStore } from './canvasStore'
import { resolveEdgeStroke } from './color'
import { CrowsFeet } from './CrowsFoot'
import { ArrowDefs, EdgeLabel } from './EdgeParts'
import { pathFor } from './edgePath'
import { EdgeToolbarContent } from './toolbar/EdgeToolbarContent'

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
  const { edge, ghost } = data as FlowEdgeData
  const fx = p.style as EdgeFxStyle | undefined
  const drawing = fx?.['--ds-dur'] !== undefined
  const dashed = edge.style.dash === 'dashed'
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
  const arrowStart = edge.arrowStart === 'arrow' && !drawing
  const arrowEnd = edge.arrowEnd === 'arrow' && !drawing
  const w = edge.style.strokeWidth
  return (
    <>
      <ArrowDefs id={id} stroke={stroke} start={arrowStart} end={arrowEnd} />
      {/* 选中光晕：一条更宽的半透明底线（比 CSS drop-shadow 便宜，全选几百条也不卡） */}
      {selected && !drawing && (
        <path d={path} className="ds-edge-halo" style={{ strokeWidth: w + 7 }} aria-hidden />
      )}
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={interactionWidth ?? 20}
        style={{
          ...fx,
          stroke,
          strokeWidth: w + (selected ? 0.5 : 0),
          strokeDasharray: dashed && !drawing ? '6 5' : undefined,
          strokeLinecap: 'round',
        }}
        className={drawing ? (dashed ? 'ds-edge-fade' : 'ds-edge-draw') : undefined}
        pathLength={drawing && !dashed ? 1 : undefined}
        markerStart={arrowStart ? `url(#ds-m-start-${id})` : undefined}
        markerEnd={arrowEnd ? `url(#ds-m-end-${id})` : undefined}
      />
      {/* 方向提示：选中单条连线时一颗光珠从起点跑到终点，只跑一趟 */}
      {selected && single && !ghost && (
        <path
          d={path}
          pathLength={1}
          className="ds-edge-comet ds-export-exclude"
          style={{ strokeWidth: w + 4 }}
          aria-hidden
        />
      )}
      {edge.cardinality && !drawing && (
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
          <EdgeLabel
            id={id}
            edge={edge}
            labelX={labelX}
            labelY={labelY}
            selected={!!selected}
            fx={drawing ? fx : undefined}
            leaving={ghost}
          />
        </EdgeLabelRenderer>
      )}
      {selected && single && !editingLabel && !ghost && (
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
    a.ghost === b.ghost &&
    prev.style === next.style &&
    prev.selected === next.selected &&
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.sourcePosition === next.sourcePosition &&
    prev.targetPosition === next.targetPosition
  )
})
