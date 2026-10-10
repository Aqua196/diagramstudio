// 插件契约（SPEC §4 + IMPL_CONTRACT §4）：三种图共用一套引擎，差异只进插件。
// render 的返回值类型用泛型隔离：core 不依赖 React，画布侧以 R=ReactNode 使用。
import type { Command } from './commands/command'
import type { DiagramDoc, DiagramEdge, DiagramNode, DiagramType, EdgeStyle } from './model/types'

export interface ShapeRenderContext {
  /** 节点文字编辑中 */
  editing: boolean
  /** 行内编辑（如 ER 字段）提交命令的唯一通道 */
  dispatch: (cmd: Command) => void
  /** 当前文档（形状做结构性渲染时用，如判断有无子节点） */
  doc: DiagramDoc
}

export interface ShapeDef<R = unknown> {
  /** 对应 DiagramNode.kind */
  kind: string
  /** 形状库里的显示名（来自 i18n） */
  name: string
  icon?: string
  defaultSize: { w: number; h: number }
  /** 拖入/双击创建时的初始文字（如 ER 实体默认名）；未设则为空 */
  defaultText?: string
  render: (node: DiagramNode, ctx: ShapeRenderContext) => R
}

export interface LayoutOptions {
  direction: 'TB' | 'LR'
}

export interface EditorContext {
  doc: DiagramDoc
  selection: { nodeIds: string[]; edgeIds: string[] }
  dispatchEvent: (name: string, detail?: unknown) => void
}

export interface DiagramPlugin<R = unknown> {
  type: DiagramType
  shapes: ShapeDef<R>[]
  edgeDefaults: Pick<DiagramEdge, 'routing' | 'arrowStart' | 'arrowEnd'> & { style: EdgeStyle }
  layout(doc: DiagramDoc, opts: LayoutOptions): Record<string, { x: number; y: number }>
  /** 图类型专属按键（如思维导图 Tab/Enter），返回待执行命令或 null 表示不处理 */
  keymap?: Record<string, (ctx: EditorContext) => Command | null>
  /** 拖动节点落到另一节点上时调用（思维导图改父级）；null 表示不支持 */
  onDropOnNode?(doc: DiagramDoc, draggedId: string, targetId: string): Command | null
  /** true 时文档每次变化后画布自动执行一次 layout（思维导图） */
  autoLayoutOnChange?: boolean
  /** 需要隐藏的节点 id（思维导图折叠的子树）；不实现则全部可见 */
  hiddenNodeIds?(doc: DiagramDoc): Set<string>
  /** 无显式锚点的边的默认出线方向：'auto'=按方位四选一；'horizontal'=恒取左右（思维导图等横向树） */
  edgeAxis?: 'auto' | 'horizontal'
  /** 删除前把所选节点扩展为应一并删除的 id（思维导图=整个子树；不可删的节点由实现过滤） */
  expandDeletion?(doc: DiagramDoc, nodeIds: string[]): string[]
  /** 声明连线有 ER 基数字段，检查器据此渲染基数下拉（禁止判断 type） */
  edgeFields?: 'cardinality'
  templates: DiagramDoc[]
}
