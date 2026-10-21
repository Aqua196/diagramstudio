// 底部居中的上手提示：随「有无选中」切换插件给的提示；可关闭（本机记住）。
import { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

const KEY = 'ds:hints:off'

function readOff(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function HintBar() {
  const [off, setOff] = useState(readOff)
  const type = useDocumentStore((s) => s.doc.type)
  const empty = useDocumentStore((s) => Object.keys(s.doc.nodes).length === 0)
  const hasSel = useUiStore((s) => s.selection.nodeIds.length > 0)
  const editing = useUiStore((s) => s.textEditing)
  const tips = getPlugin(type).tips
  if (off || !tips || empty || editing) return null
  const list = hasSel ? tips.selected : tips.idle
  return (
    <div className="ds-hint" role="note" aria-label={zh.editor.hintLabel}>
      <Lightbulb size={14} className="ds-hint-icon" />
      {list.map((t, i) => (
        <span key={t} className="ds-hint-item">
          {i > 0 && (
            <span className="ds-hint-dot" aria-hidden>
              ·
            </span>
          )}
          {t}
        </span>
      ))}
      <button
        type="button"
        className="ds-hint-close"
        aria-label={zh.editor.hintDismiss}
        title={zh.editor.hintDismiss}
        onClick={() => {
          setOff(true)
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            /* 隐私模式下不记忆也无妨 */
          }
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}
