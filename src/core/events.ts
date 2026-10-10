// 跨模块事件名（纯字符串常量，core 不依赖 DOM）。
// 用法：window.dispatchEvent(new CustomEvent(EV.X, { detail }))；由所有者 feature 监听。
// 所有权表见 docs/IMPL_CONTRACT.md §5。
export const EV = {
  SELECT_ALL: 'ds:select-all',
  COPY: 'ds:clipboard:copy',
  CUT: 'ds:clipboard:cut',
  PASTE: 'ds:clipboard:paste',
  DUPLICATE: 'ds:clipboard:duplicate',
  DELETE: 'ds:delete',
  Z_FRONT: 'ds:z:front',
  Z_BACK: 'ds:z:back',
  ALIGN: 'ds:align', // detail: 'left'|'center'|'right'|'top'|'middle'|'bottom'
  DISTRIBUTE: 'ds:distribute', // detail: 'h'|'v'
  AUTO_LAYOUT: 'ds:auto-layout', // detail: 'TB'|'LR'
  FIT: 'ds:fit',
  ZOOM_IN: 'ds:zoom:in',
  ZOOM_OUT: 'ds:zoom:out',
  ZOOM_RESET: 'ds:zoom:reset',
  NEW_DOC: 'ds:doc:new', // detail: { type, templateId? }
  OPEN_DOC: 'ds:doc:open', // detail: { id }
  RENAME_DOC: 'ds:doc:rename', // detail: { id, title }
  DUPLICATE_DOC: 'ds:doc:duplicate', // detail: { id }
  DELETE_DOC: 'ds:doc:delete', // detail: { id }
  SAVE: 'ds:save',
  EXPORT_JSON: 'ds:export:json',
  EXPORT_PNG: 'ds:export:png', // detail: { scale, background, titleblock }
  EXPORT_SVG: 'ds:export:svg', // detail: { titleblock }
  EXPORT_MERMAID: 'ds:export:mermaid',
  IMPORT_JSON: 'ds:import:json',
  IMPORT_MERMAID: 'ds:import:mermaid',
  SET_TOOL: 'ds:tool', // detail: 'select'|'hand'
  SHOW_SHORTCUTS: 'ds:shortcuts:show',
  SHARE: 'ds:share',
} as const

export type EvName = (typeof EV)[keyof typeof EV]

export function emit(name: EvName, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}
