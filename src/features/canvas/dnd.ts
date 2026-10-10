// 形状库拖放约定（IMPL_CONTRACT §6）：drag source 与 canvas drop 共用的 MIME。
export const DND_SHAPE_MIME = 'application/x-diagram-shape'

export function setShapeDragData(dt: DataTransfer, kind: string): void {
  dt.setData(DND_SHAPE_MIME, kind)
  dt.effectAllowed = 'copy'
}

export function getShapeDragData(dt: DataTransfer): string | null {
  const kind = dt.getData(DND_SHAPE_MIME)
  return kind || null
}
