// 文档导航/toast 共用助手（C1：useDocEvents 与 docIoHandlers 共享）。
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { setLastOpened } from './docsStore'

export function openDocInEditor(doc: DiagramDoc): void {
  useDocumentStore.getState().setDoc(doc)
  setLastOpened(doc.id)
  useUiStore.getState().setRoute('editor')
  useUiStore.getState().setSelection({ nodeIds: [], edgeIds: [] })
}

export function toast(kind: 'info' | 'success' | 'error', text: string): void {
  useUiStore.getState().pushToast(kind, text)
}
