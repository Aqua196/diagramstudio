// 节点文字行内编辑（SPEC §5）：Enter 提交、Shift+Enter 换行、Esc 取消、失焦提交。
// 覆盖在节点上方的 textarea，尺寸与字号随缩放同步。
import { useEffect, useRef, useState } from 'react'
import { useViewport } from '@xyflow/react'
import { updateNodeText } from '@/core/commands/ops'
import type { DiagramNode } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { enterRemaining } from './motion/hints'

export function NodeTextEditor({ node, onDone }: { node: DiagramNode; onDone: () => void }) {
  const { x, y, zoom } = useViewport()
  const execute = useDocumentStore((s) => s.execute)
  const setTextEditing = useUiStore((s) => s.setTextEditing)
  const [value, setValue] = useState(node.text)
  // 新节点还在从父/源节点长出时，编辑框等它快落位再浮现（焦点立即就绪，可以直接打字）
  const [defer] = useState(() => Math.max(0, Math.round(enterRemaining(node.id) - 80)))
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    if (value !== node.text) execute(updateNodeText(node.id, value))
    setTextEditing(false)
    onDone()
  }
  const cancel = () => {
    setTextEditing(false)
    onDone()
  }

  return (
    <textarea
      ref={ref}
      className="ds-text-editor"
      value={value}
      aria-label={zh.toolbar.editText}
      placeholder={zh.canvas.textPlaceholder}
      style={{
        left: node.position.x * zoom + x,
        top: node.position.y * zoom + y,
        width: node.size.w * zoom,
        height: node.size.h * zoom,
        fontSize: node.style.fontSize * zoom,
        fontWeight: node.style.bold ? 700 : 400,
        textAlign: node.style.align,
        animationDelay: defer ? `${defer}ms` : undefined,
      }}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => editorKey(e, commit, cancel)}
    />
  )
}

function editorKey(e: React.KeyboardEvent, commit: () => void, cancel: () => void): void {
  e.stopPropagation()
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    commit()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}
