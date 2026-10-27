// 「没动过的空白文档」回收：点了「新建空白」又直接离开时，不在首页留下一堆空的未命名图表。
// 新建空白时登记；一旦有编辑就注销；离开（回首页/打开别的/新建别的）时若仍未动过则删除。
import { useDocumentStore } from '@/store/documentStore'
import { deleteStoredDoc } from '@/core/io/persist'

let pristineId: string | null = null

export function markPristine(id: string): void {
  pristineId = id
}

/** 离开当前文档前调用 */
export function discardPristine(): void {
  if (!pristineId) return
  const { doc, canUndo } = useDocumentStore.getState()
  if (doc.id === pristineId && !canUndo) deleteStoredDoc(pristineId)
  pristineId = null
}

/** 挂一次：有任何本地编辑即注销登记；返回取消订阅 */
export function watchPristine(): () => void {
  return useDocumentStore.subscribe((s) => {
    if (pristineId && s.doc.id === pristineId && s.lastChange === 'execute') pristineId = null
  })
}
