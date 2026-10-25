// 左上：返回首页（品牌标）+ 可编辑文档名 + 图类型 + 自动保存状态。
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { setDocTitle } from '@/core/commands/ops'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { Tip } from '@/components/Tip'
import { BrandMark } from '@/components/BrandMark'
import { goHome } from '../docs/docNav'

function DocTitle() {
  const title = useDocumentStore((s) => s.doc.title)
  const execute = useDocumentStore((s) => s.execute)
  const [draft, setDraft] = useState<string | null>(null)
  if (draft === null) {
    return (
      <Tip label={zh.common.rename}>
        <button
          type="button"
          className="ds-title"
          aria-label={zh.editor.docTitle}
          onClick={() => setDraft(title)}
        >
          {title || zh.editor.docTitle}
        </button>
      </Tip>
    )
  }
  return (
    <input
      className="ds-input ds-title-input"
      value={draft}
      autoFocus
      aria-label={zh.editor.docTitle}
      onFocus={(e) => e.target.select()}
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

function SaveStatus() {
  const lastSavedAt = useUiStore((s) => s.lastSavedAt)
  const type = useDocumentStore((s) => s.doc.type)
  return (
    <span className="ds-doc-meta" aria-live="polite">
      {zh.plugins.typeNames[type]}
      {lastSavedAt && <span className="ds-doc-saved"> · {zh.editor.saved}</span>}
    </span>
  )
}

export function TopLeftBar() {
  return (
    <div className="ds-float ds-corner ds-corner-tl">
      <Tip label={zh.editor.home}>
        <button type="button" className="ds-home-btn" aria-label={zh.editor.home} onClick={goHome}>
          <ChevronLeft size={16} className="ds-home-chev" />
          <BrandMark size={22} />
        </button>
      </Tip>
      <span className="ds-sep" />
      <div className="ds-doc-head">
        <DocTitle />
        <SaveStatus />
      </div>
    </div>
  )
}
