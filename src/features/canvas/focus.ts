// 加节点后的焦点交接：命令执行后若恰好新增一个节点，选中它并进入文字编辑，
// 让「Tab 加子主题 → 直接打字 → Enter」「点 + → 直接打字」一气呵成。
import type { Command } from '@/core/commands/command'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { useCanvasStore } from './canvasStore'
import { expectEnter } from './motion/hints'

export function startEditing(id: string): void {
  useCanvasStore.getState().setEditingNode(id)
  useUiStore.getState().setTextEditing(true)
}

export function executeAndFocus(cmd: Command, opts: { edit?: boolean } = {}): string | null {
  const before = useDocumentStore.getState().doc
  useDocumentStore.getState().execute(cmd)
  const after = useDocumentStore.getState().doc
  const added = Object.keys(after.nodes).filter((id) => !before.nodes[id])
  if (added.length !== 1) return null
  const id = added[0]
  expectEnter(id, before, after)
  useUiStore.getState().setSelection({ nodeIds: [id], edgeIds: [] })
  if (opts.edit !== false) startEditing(id)
  return id
}
