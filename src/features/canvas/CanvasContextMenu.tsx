// 画布右键菜单：菜单项随当前 selection 变化（IMPL_CONTRACT §6），带快捷键提示；
// 行为统一走 EV.* 事件派发，不直接改文档。空白处右键提供粘贴/全选/适应画面。
import type { ReactNode } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import {
  BringToFront,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Maximize,
  Pencil,
  Scissors,
  SendToBack,
  SquareDashedMousePointer,
  Trash2,
} from 'lucide-react'
import { emit, EV, type EvName } from '@/core/events'
import { useUiStore } from '@/store/uiStore'
import { keyLabel } from '@/components/kbd'
import { hasClipboard } from './clipboard'
import { zh } from '@/i18n/zh'

const s = zh.shortcuts

function Item({
  icon,
  label,
  kbd,
  ev,
  danger,
}: {
  icon: ReactNode
  label: string
  kbd?: string
  ev: EvName
  danger?: boolean
}) {
  return (
    <ContextMenu.Item
      className={`ds-menu-item${danger ? ' is-danger' : ''}`}
      onSelect={() => emit(ev)}
    >
      {icon}
      {label}
      {kbd && <span className="ds-menu-kbd">{keyLabel(kbd)}</span>}
    </ContextMenu.Item>
  )
}

function MenuItems() {
  const sel = useUiStore((st) => st.selection)
  const singleNode = sel.nodeIds.length === 1 && sel.edgeIds.length === 0
  const hasNodes = sel.nodeIds.length > 0
  const hasSelection = hasNodes || sel.edgeIds.length > 0
  return (
    <>
      {singleNode && (
        <Item icon={<Pencil size={16} />} label={zh.toolbar.editText} kbd="F2" ev={EV.EDIT_TEXT} />
      )}
      {hasNodes && (
        <>
          <Item icon={<Copy size={16} />} label={s.copy} kbd="Ctrl+C" ev={EV.COPY} />
          <Item icon={<Scissors size={16} />} label={s.cut} kbd="Ctrl+X" ev={EV.CUT} />
          <Item icon={<CopyPlus size={16} />} label={s.duplicate} kbd="Ctrl+D" ev={EV.DUPLICATE} />
        </>
      )}
      {hasClipboard() && (
        <Item icon={<ClipboardPaste size={16} />} label={s.paste} kbd="Ctrl+V" ev={EV.PASTE} />
      )}
      {!hasSelection && (
        <>
          <Item
            icon={<SquareDashedMousePointer size={16} />}
            label={s.selectAll}
            kbd="Ctrl+A"
            ev={EV.SELECT_ALL}
          />
          <Item icon={<Maximize size={16} />} label={s.fit} kbd="Ctrl+0" ev={EV.FIT} />
        </>
      )}
      {hasNodes && (
        <>
          <ContextMenu.Separator className="ds-menu-sep" />
          <Item icon={<BringToFront size={16} />} label={s.zFront} kbd="]" ev={EV.Z_FRONT} />
          <Item icon={<SendToBack size={16} />} label={s.zBack} kbd="[" ev={EV.Z_BACK} />
        </>
      )}
      {hasSelection && (
        <>
          <ContextMenu.Separator className="ds-menu-sep" />
          <Item
            icon={<Trash2 size={16} />}
            label={zh.common.delete}
            kbd="Del"
            ev={EV.DELETE}
            danger
          />
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
