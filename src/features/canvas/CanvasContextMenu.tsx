// 画布右键菜单：菜单项随当前 selection 变化（IMPL_CONTRACT §6），
// 行为统一走 EV.* 事件派发，不直接改文档。
import type { ReactNode } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { emit, EV } from '@/core/events'
import { useUiStore } from '@/store/uiStore'
import { hasClipboard } from './clipboard'
import { useCanvasStore } from './canvasStore'
import { zh } from '@/i18n/zh'

export function CanvasContextMenu({ children }: { children: ReactNode }) {
  const sel = useUiStore((s) => s.selection)
  const setEditingNode = useCanvasStore((s) => s.setEditingNode)
  const setTextEditing = useUiStore((s) => s.setTextEditing)
  const singleNode = sel.nodeIds.length === 1 && sel.edgeIds.length === 0
  const hasNodes = sel.nodeIds.length > 0
  const hasSelection = hasNodes || sel.edgeIds.length > 0

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="ds-menu">
          {singleNode && (
            <ContextMenu.Item
              className="ds-menu-item"
              onSelect={() => {
                setEditingNode(sel.nodeIds[0])
                setTextEditing(true)
              }}
            >
              {zh.inspector.text}
            </ContextMenu.Item>
          )}
          {hasNodes && (
            <>
              <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.COPY)}>
                {zh.shortcuts.copy}
              </ContextMenu.Item>
              <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.CUT)}>
                {zh.shortcuts.cut}
              </ContextMenu.Item>
              <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.DUPLICATE)}>
                {zh.common.duplicate}
              </ContextMenu.Item>
            </>
          )}
          {hasClipboard() && (
            <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.PASTE)}>
              {zh.shortcuts.paste}
            </ContextMenu.Item>
          )}
          {hasNodes && (
            <>
              <ContextMenu.Separator className="ds-menu-sep" />
              <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.Z_FRONT)}>
                {zh.inspector.zFront}
              </ContextMenu.Item>
              <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.Z_BACK)}>
                {zh.inspector.zBack}
              </ContextMenu.Item>
            </>
          )}
          {hasSelection && (
            <>
              <ContextMenu.Separator className="ds-menu-sep" />
              <ContextMenu.Item className="ds-menu-item" onSelect={() => emit(EV.DELETE)}>
                {zh.common.delete}
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
