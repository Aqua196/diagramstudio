// 快捷键帮助对话框（Radix Dialog）：按组列出全部快捷键。
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { SHORTCUT_GROUPS, SHORTCUT_ROWS, type ShortcutRow } from './keys'

const GROUP_ORDER: ShortcutRow['group'][] = ['tools', 'edit', 'view', 'arrange']

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsHelpOpen)
  const setOpen = useUiStore((s) => s.setShortcutsHelpOpen)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content className="ds-dialog" aria-describedby={undefined}>
          <div className="ds-dialog-head">
            <Dialog.Title className="ds-dialog-title">{zh.shortcuts.title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="ds-icon-btn" aria-label={zh.common.close}>
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>
          {GROUP_ORDER.map((g) => (
            <div key={g} className="ds-sc-group">
              <div className="ds-panel-title">{SHORTCUT_GROUPS[g]}</div>
              {SHORTCUT_ROWS.filter((r) => r.group === g).map((r) => (
                <div key={r.keys} className="ds-sc-row">
                  <kbd className="ds-kbd">{r.keys}</kbd>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
