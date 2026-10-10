// 文档唯一真相源（IMPL_CONTRACT §3）：一切文档修改经 execute(command)。
// 组件必须用选择器订阅，禁止取整个 store。
import { create } from 'zustand'
import type { Command } from '@/core/commands/command'
import {
  emptyHistory,
  executeCommand,
  redoCommand,
  redoLabel,
  undoCommand,
  undoLabel,
  type HistoryState,
} from '@/core/commands/history'
import { createDoc } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'

export interface DocumentStore {
  doc: DiagramDoc
  history: HistoryState
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
  execute: (cmd: Command) => void
  undo: () => void
  redo: () => void
  /** 载入/导入/协作远端写入：不进历史；resetHistory=false 时保留本地历史（协作） */
  setDoc: (doc: DiagramDoc, opts?: { resetHistory?: boolean }) => void
}

function derive(history: HistoryState) {
  return {
    history,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undoLabel: undoLabel(history),
    redoLabel: redoLabel(history),
  }
}

export const useDocumentStore = create<DocumentStore>()((set, get) => ({
  doc: createDoc('flowchart'),
  history: emptyHistory(),
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null,

  execute: (cmd) => {
    const { doc, history } = get()
    const r = executeCommand(doc, history, cmd)
    if (r.doc === doc && r.history === history) return
    set({ doc: r.doc, ...derive(r.history) })
  },

  undo: () => {
    const { doc, history } = get()
    const r = undoCommand(doc, history)
    if (r.doc === doc) return
    set({ doc: r.doc, ...derive(r.history) })
  },

  redo: () => {
    const { doc, history } = get()
    const r = redoCommand(doc, history)
    if (r.doc === doc) return
    set({ doc: r.doc, ...derive(r.history) })
  },

  setDoc: (doc, opts) => {
    const history = opts?.resetHistory === false ? get().history : emptyHistory()
    set({ doc, ...derive(history) })
  },
}))
