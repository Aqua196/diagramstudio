// 节点文字行内编辑（SPEC §5）：Enter 提交、Shift+Enter 换行、Esc 取消、失焦提交。
// 编辑框就长在形状自己的文字位里（插件渲染时把它放在原本显示文字的地方）：字号、字重、颜色、
// 对齐与形状的内边距都和平时显示一致，随节点一起移动和缩放——改的是哪个形状一眼可见，
// 而不是盖一个统一的白色方框上去。
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { updateNodeText } from '@/core/commands/ops'
import type { DiagramNode } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

/** textarea 高度跟着内容走，在文字位里垂直居中；超出文字位时滚动 */
function fit(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export function NodeTextEditor({ node, onDone }: { node: DiagramNode; onDone: () => void }) {
  const execute = useDocumentStore((s) => s.execute)
  const setTextEditing = useUiStore((s) => s.setTextEditing)
  const [value, setValue] = useState(node.text)
  const ref = useRef<HTMLTextAreaElement>(null)
  const latest = useRef({ value, text: node.text, id: node.id })
  latest.current = { value, text: node.text, id: node.id }

  useLayoutEffect(() => fit(ref.current), [value])
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    ref.current?.select()
    // 节点因滚出视野被卸载时不丢已输入的内容（正常结束走 commit/cancel，不会到这里时还有改动）
    return () => {
      const { value: v, text, id } = latest.current
      if (v !== text) useDocumentStore.getState().execute(updateNodeText(id, v))
    }
  }, [])

  const commit = () => {
    if (value !== node.text) execute(updateNodeText(node.id, value))
    latest.current.text = value
    setTextEditing(false)
    onDone()
  }
  const cancel = () => {
    setValue(node.text)
    latest.current.value = node.text
    setTextEditing(false)
    onDone()
  }

  return (
    <textarea
      ref={ref}
      className="ds-text-editor nodrag nopan nowheel"
      rows={1}
      value={value}
      aria-label={zh.toolbar.editText}
      placeholder={zh.canvas.textPlaceholder}
      style={{ textAlign: node.style.align }}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => editorKey(e, commit, cancel)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  )
}

function editorKey(e: React.KeyboardEvent, commit: () => void, cancel: () => void): void {
  e.stopPropagation()
  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault()
    commit()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}
