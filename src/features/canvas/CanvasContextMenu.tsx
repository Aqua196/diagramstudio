// 画布右键菜单：菜单项随当前 selection 变化（IMPL_CONTRACT §6），
// 行为统一走 EV.* 事件派发，不直接改文档。
import type { ReactNode } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { emit, EV } from '@/core/events'
import { useUiStore } from '@/store/uiStore'
import { hasClipboard } from './clipboard'
import { useCanvasStore } from './canvasStore'
import { zh } from '@/i18n/zh'

function Item({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <ContextMenu.Item className="ds-menu-item" onSelect={onSelect}>
      {label}
    </ContextMenu.Item>
  )
}

function MenuItems() {
  const sel = useUiStore((s) => s.selection)
  const setEditingNode = useCanvasStore((s) => s.setEditingNode)
  const setTextEditing = useUiStore((s) => s.setTextEditing)
  const singleNode = sel.nodeIds.length === 1 && sel.edgeIds.length === 0
  const hasNodes = sel.nodeIds.length > 0
  const hasSelection = hasNodes || sel.edgeIds.length > 0
  return (
    <>
      {singleNode && (
        <Item
          label={zh.inspector.text}
          onSelect={() => {
            setEditingNode(sel.nodeIds[0])
            setTextEditing(true)
          }}
        />
      )}
      {hasNodes && (
        <>
          <Item label={zh.shortcuts.copy} onSelect={() => emit(EV.COPY)} />
          <Item label={zh.shortcuts.cut} onSelect={() => emit(EV.CUT)} />
          <Item label={zh.common.duplicate} onSelect={() => emit(EV.DUPLICATE)} />
        </>
      )}
      {hasClipboard() && <Item label={zh.shortcuts.paste} onSelect={() => emit(EV.PASTE)} />}
      {hasNodes && (
        <>
          <ContextMenu.Separator className="ds-menu-sep" />
          <Item label={zh.inspector.zFront} onSelect={() => emit(EV.Z_FRONT)} />
          <Item label={zh.inspector.zBack} onSelect={() => emit(EV.Z_BACK)} />
        </>
      )}
      {hasSelection && (
        <>
          <ContextMenu.Separator className="ds-menu-sep" />
          <Item label={zh.common.delete} onSelect={() => emit(EV.DELETE)} />
        </>
      )}
    </>
  )
}

export function CanvasContextMenu({ children }: { children: ReactNode }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="ds-menu">
          <MenuItems />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
