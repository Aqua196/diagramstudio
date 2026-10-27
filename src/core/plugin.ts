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
  /** 编辑中时画布提供的行内编辑框：形状把它放在原本显示文字的位置（类型由画布侧决定） */
  editor?: unknown
}

export interface ShapeDef<R = unknown> {
  /** 对应 DiagramNode.kind */
  kind: string
  /** 形状库里的显示名（来自 i18n） */
  name: string
  /** 形状坞图标（插件提供的 20×20 线框图） */
  icon?: R
  defaultSize: { w: number; h: number }
  /** 拖入/双击创建时的初始文字（如 ER 实体默认名）；未设则为空 */
  defaultText?: string
  /** 新建时的插件私有数据（如 ER 实体预置 id 主键）；每次调用返回新对象 */
  defaultData?: () => Record<string, unknown>
  /** 不在形状坞中显示（如思维导图中心主题：空白文档已自带） */
  paletteHidden?: boolean
  render: (node: DiagramNode, ctx: ShapeRenderContext) => R
}

export type NodeSide = 'top' | 'right' | 'bottom' | 'left'

/** 上下文工具条上的插件专属动作（思维导图「加子主题」、ER「加字段」） */
export interface NodeAction<R = unknown> {
  id: string
  label: string
  /** 快捷键提示（仅展示用） */
  kbd?: string
  icon?: R
  run: (ctx: EditorContext) => Command | null
}

/** 上手提示：无选择时 / 选中节点时各一组（提示条展示） */
export interface PluginTips {
  idle: readonly string[]
  selected: readonly string[]
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
  /** 新连线默认值；cardinality 仅 ER（新关系默认 1 对 0..N） */
  edgeDefaults: Pick<DiagramEdge, 'routing' | 'arrowStart' | 'arrowEnd' | 'cardinality'> & {
    style: EdgeStyle
  }
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
  /** 声明连线有 ER 基数字段，工具条据此渲染基数选择（禁止判断 type） */
  edgeFields?: 'cardinality'
  /** 能导出为 Mermaid 文本（目前只有流程图）；导出对话框与导出命令据此判断，不判断 type */
  mermaid?: boolean
  /** 选中单节点时上下文工具条的额外动作 */
  nodeActions?: NodeAction<R>[]
  /** 形状坞点击创建：返回命令（思维导图=挂到所选/根下）；null=交给画布放到视口中心 */
  placeFromPalette?(doc: DiagramDoc, kind: string, selection: { nodeIds: string[] }): Command | null
  /** 选中单节点时四周「+」快捷添加的方向；不实现=四向，[]=关闭 */
  quickAddSides?: NodeSide[]
  /** 快捷添加时新节点的形状（流程图：起止/判断之后接「处理」）；不实现=同形状 */
  nextKind?(fromKind: string): string
  /** 新建空白文档的初始内容（思维导图预置中心主题）；不实现=空文档 */
  createBlank?(title: string): DiagramDoc
  /** 上手提示 */
  tips?: PluginTips
  templates: DiagramDoc[]
}
