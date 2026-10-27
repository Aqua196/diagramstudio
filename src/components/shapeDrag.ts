// 形状库拖放约定（IMPL_CONTRACT §6）：形状坞（拖出）与画布（放下）共用的 MIME。
// 放在共享组件层：两边都依赖这份约定，而不是形状坞去依赖画布模块。
export const DND_SHAPE_MIME = 'application/x-diagram-shape'

export function setShapeDragData(dt: DataTransfer, kind: string): void {
  dt.setData(DND_SHAPE_MIME, kind)
  dt.effectAllowed = 'copy'
}

export function getShapeDragData(dt: DataTransfer): string | null {
  const kind = dt.getData(DND_SHAPE_MIME)
  return kind || null
}
