// 文档导航/toast 共用助手（C1：useDocEvents 与 docIoHandlers 共享）。
// 首页 ↔ 编辑器的切换走 pageTransition：卡片缩略图与画布之间做共享元素形变。
// 转场会把真正的切换推迟到下一帧，所以「切换之后才该做的事」一律放进 after，在切换的同一刻执行。
import type { DiagramDoc } from '@/core/model/types'
import { revealNext } from '@/features/canvas/motion/hints'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { pageTransition } from '../transition'
import { getStoredDoc, saveDoc, setLastOpened } from './docsStore'
import { discardPristine } from './pristine'

/** 离开当前文档前立即落盘：自动保存有 500ms 防抖，刚改的内容否则会丢（只存已在列表里的文档） */
function flushSave(): void {
  const cur = useDocumentStore.getState().doc
  if (!getStoredDoc(cur.id)) return
  saveDoc(cur)
  useUiStore.getState().setLastSavedAt(Date.now())
}

/** 切换完成后把焦点交给新页面的主体（被点的按钮已卸载，否则焦点会掉到 body） */
function focusSoon(selector: string): void {
  window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }), 0)
}

export interface OpenOptions {
  /** 示例/导入：画布依次「自绘」出这张图 */
  reveal?: boolean
  /** 切换到编辑器的同一刻执行（登记空白文档、提示条等） */
  after?: () => void
}

/** 打开文档进编辑器；离开的那份先落盘，若是没动过的空白文档则顺手回收 */
export function openDocInEditor(doc: DiagramDoc, opts: OpenOptions = {}): void {
  if (opts.reveal) revealNext(doc.id)
  const apply = () => {
    if (useDocumentStore.getState().doc.id !== doc.id) {
      flushSave()
      discardPristine()
    }
    useDocumentStore.getState().setDoc(doc)
    setLastOpened(doc.id)
    useUiStore.getState().setRoute('editor')
    useUiStore.getState().setSelection({ nodeIds: [], edgeIds: [] })
    opts.after?.()
    focusSoon('.ds-editor-canvas')
  }
  // 已在编辑器里换文档（示例模板、导入）不做页面转场
  if (useUiStore.getState().route === 'home') pageTransition(apply)
  else apply()
}

/** 回首页：画布形变回当前文档在「最近的图表」里的卡片缩略图 */
export function goHome(): void {
  const id = useDocumentStore.getState().doc.id
  const card = () => document.querySelector(`[data-doc-id="${CSS.escape(id)}"]`)
  pageTransition(
    () => {
      flushSave()
      useUiStore.getState().setRoute('home')
      focusSoon(`[data-doc-id="${CSS.escape(id)}"] .ds-doc-open`)
    },
    () => card()?.querySelector('.ds-doc-thumb') ?? null,
  )
}

export function toast(kind: 'info' | 'success' | 'error', text: string): void {
  useUiStore.getState().pushToast(kind, text)
}
