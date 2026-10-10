// 文档数据模型（SPEC §4）。集合一律用 id 为键的 Record，便于 immer 补丁与 Yjs 映射。

export type DiagramType = 'flowchart' | 'mindmap' | 'er'

export interface Point {
  x: number
  y: number
}

export interface Size {
  w: number
  h: number
}

/** 节点样式。fill/stroke 存 palette key（core/palette.ts），stroke 也可为 'ink'。 */
export interface NodeStyle {
  fill: string
  stroke: string
  strokeWidth: number
  dash: 'solid' | 'dashed'
  fontSize: number
  bold: boolean
  align: 'left' | 'center' | 'right'
}

export interface EdgeStyle {
  stroke: string
  strokeWidth: number
  dash: 'solid' | 'dashed'
}

export type EdgeRouting = 'bezier' | 'step' | 'straight'
export type EdgeArrow = 'none' | 'arrow'
export type Cardinality = '1' | '0..1' | 'N' | '0..N'

export interface DiagramNode {
  id: string
  /** 形状种类，由所属插件的 ShapeDef.kind 定义 */
  kind: string
  position: Point
  size: Size
  text: string
  style: NodeStyle
  /** 插件私有数据：mindmap {parentId,collapsed}；er {fields:ErField[]} */
  data: Record<string, unknown>
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  routing: EdgeRouting
  arrowStart: EdgeArrow
  arrowEnd: EdgeArrow
  label?: string
  style: EdgeStyle
  /** 仅 ER：两端基数 */
  cardinality?: { source: Cardinality; target: Cardinality }
}

export interface ErField {
  id: string
  name: string
  type: string
  pk?: boolean
  fk?: boolean
}

export interface DiagramDoc {
  schemaVersion: 1
  id: string
  title: string
  type: DiagramType
  nodes: Record<string, DiagramNode>
  edges: Record<string, DiagramEdge>
  /** 节点叠放顺序，靠后者在上 */
  zOrder: string[]
  settings: {
    grid: boolean
    snap: boolean
    /** 自动布局方向，同时作为 Mermaid 导出方向 */
    layoutDirection: 'TB' | 'LR'
  }
  createdAt: number
  updatedAt: number
}
