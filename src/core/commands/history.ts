// 命令历史（SPEC §4）：produceWithPatches 收补丁/逆补丁入栈；
// 相同 coalesceKey 且间隔 <600ms 合并；上限 200 条；撤销按钮提示展示 label。
import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer'
import type { DiagramDoc } from '../model/types'
import type { Command } from './command'

enablePatches()

export const HISTORY_LIMIT = 200
export const COALESCE_WINDOW_MS = 600

export interface HistoryEntry {
  label: string
  coalesceKey?: string
  patches: Patch[]
  inversePatches: Patch[]
  at: number
}

/** 纯数据结构的历史栈：由 documentStore 持有并序列化进出 */
export interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

export function emptyHistory(): HistoryState {
  return { past: [], future: [] }
}

export interface ExecuteResult {
  doc: DiagramDoc
  history: HistoryState
}

/** 执行一条命令，返回新文档与新历史 */
export function executeCommand(
  doc: DiagramDoc,
  history: HistoryState,
  cmd: Command,
  now = Date.now(),
): ExecuteResult {
  const [next, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    cmd.apply(draft)
    draft.updatedAt = now
  })
  // 无任何实质改动的命令不入栈
  if (patches.length === 0) return { doc, history }

  const past = [...history.past]
  const top = past[past.length - 1]
  if (
    top &&
    cmd.coalesceKey !== undefined &&
    top.coalesceKey === cmd.coalesceKey &&
    now - top.at < COALESCE_WINDOW_MS
  ) {
    // 合并：正补丁追加在后，逆补丁前插（撤销时先还原后发生的改动），label 保留首条
    past[past.length - 1] = {
      ...top,
      patches: [...top.patches, ...patches],
      inversePatches: [...inversePatches, ...top.inversePatches],
      at: now,
    }
  } else {
    past.push({
      label: cmd.label,
      coalesceKey: cmd.coalesceKey,
      patches,
      inversePatches,
      at: now,
    })
    if (past.length > HISTORY_LIMIT) past.shift()
  }
  return { doc: next, history: { past, future: [] } }
}

export function undoCommand(doc: DiagramDoc, history: HistoryState): ExecuteResult {
  const entry = history.past[history.past.length - 1]
  if (!entry) return { doc, history }
  const next = applyPatches(doc, entry.inversePatches)
  return {
    doc: next,
    history: { past: history.past.slice(0, -1), future: [...history.future, entry] },
  }
}

export function redoCommand(doc: DiagramDoc, history: HistoryState): ExecuteResult {
  const entry = history.future[history.future.length - 1]
  if (!entry) return { doc, history }
  const next = applyPatches(doc, entry.patches)
  return {
    doc: next,
    history: { past: [...history.past, entry], future: history.future.slice(0, -1) },
  }
}

export function undoLabel(history: HistoryState): string | null {
  return history.past[history.past.length - 1]?.label ?? null
}

export function redoLabel(history: HistoryState): string | null {
  return history.future[history.future.length - 1]?.label ?? null
}
