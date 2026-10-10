// 顶栏左侧：可编辑文档名 + 保存时间徽标（从 TopBar 拆出，C1）。
import { useState } from 'react'
import { setDocTitle } from '@/core/commands/ops'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

export function DocTitle() {
  const title = useDocumentStore((s) => s.doc.title)
  const execute = useDocumentStore((s) => s.execute)
  const [draft, setDraft] = useState<string | null>(null)
  return draft === null ? (
    <button
      type="button"
      className="ds-title"
      aria-label={zh.topbar.docTitle}
      onClick={() => setDraft(title)}
    >
      {title || zh.topbar.docTitle}
    </button>
  ) : (
    <input
      className="ds-input ds-title-input"
      value={draft}
      autoFocus
      aria-label={zh.topbar.docTitle}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== title) execute(setDocTitle(draft.trim()))
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setDraft(null)
        e.stopPropagation()
      }}
    />
  )
}

export function SaveStatus() {
  const lastSavedAt = useUiStore((s) => s.lastSavedAt)
  if (!lastSavedAt) return null
  const t = new Date(lastSavedAt)
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  return (
    <span className="ds-save-status" aria-live="polite">
      {zh.topbar.savedPrefix} {hh}:{mm}
    </span>
  )
}
