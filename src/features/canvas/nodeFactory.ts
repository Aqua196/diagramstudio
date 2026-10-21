// 画布侧统一的「按形状建节点」：拖入、双击、形状坞、快捷加号、连线菜单共用，
// 保证默认尺寸/文字/插件私有数据（如 ER 预置主键）一致。
import { createEdge, createNode } from '@/core/model/factories'
import type { DiagramEdge, DiagramNode, Point } from '@/core/model/types'
import type { DiagramPlugin } from '@/core/plugin'

export const SNAP = 12

/** 以 center 为中心创建 kind 形状节点；snap=true 时左上角对齐 12px 网格 */
export function createShapeNode(
  plugin: DiagramPlugin,
  kind: string | null,
  center: Point,
  snap = false,
): DiagramNode | null {
  const shape = (kind && plugin.shapes.find((s) => s.kind === kind)) || plugin.shapes[0]
  if (!shape) return null
  const { w, h } = shape.defaultSize
  const step = snap ? SNAP : 1
  const node = createNode(
    shape.kind,
    {
      x: Math.round((center.x - w / 2) / step) * step,
      y: Math.round((center.y - h / 2) / step) * step,
    },
    { w, h },
    shape.defaultText ?? '',
  )
  if (shape.defaultData) node.data = shape.defaultData()
  return node
}

/** 按插件默认值建连线（拖线连接、连线菜单、快捷加号共用） */
export function createPluginEdge(
  plugin: DiagramPlugin,
  source: string,
  target: string,
  extra?: Partial<DiagramEdge>,
): DiagramEdge {
  const d = plugin.edgeDefaults
  return createEdge(source, target, {
    routing: d.routing,
    arrowStart: d.arrowStart,
    arrowEnd: d.arrowEnd,
    style: { ...d.style },
    cardinality: d.cardinality ? { ...d.cardinality } : undefined,
    ...extra,
  })
}
