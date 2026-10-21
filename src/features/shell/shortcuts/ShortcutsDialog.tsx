// 快捷键面板（Radix Dialog）：按组两栏排列，按键用键帽样式。
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { keyLabel } from '@/components/kbd'
import { SHORTCUT_GROUPS, SHORTCUT_ROWS, type ShortcutRow } from './keys'

const GROUP_ORDER: ShortcutRow['group'][] = ['edit', 'tools', 'view', 'arrange']

function Keys({ combo }: { combo: string }) {
  return (
    <span className="ds-sc-keys">
      {combo.split(' / ').map((k) => (
        <kbd key={k} className="ds-kbd">
          {keyLabel(k)}
        </kbd>
      ))}
    </span>
  )
}

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsHelpOpen)
  const setOpen = useUiStore((s) => s.setShortcutsHelpOpen)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content
          className="ds-dialog ds-dialog-wide ds-sc-dialog"
          aria-describedby={undefined}
        >
          <div className="ds-dialog-head">
            <Dialog.Title className="ds-dialog-title">{zh.shortcuts.title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="ds-icon-btn" aria-label={zh.common.close}>
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="ds-sc-grid">
            {GROUP_ORDER.map((g) => (
              <section key={g} className="ds-sc-group">
                <h3 className="ds-sc-group-title">{SHORTCUT_GROUPS[g]}</h3>
                {SHORTCUT_ROWS.filter((r) => r.group === g).map((r) => (
                  <div key={r.keys + r.label} className="ds-sc-row">
                    <span>{r.label}</span>
                    <Keys combo={r.keys} />
                  </div>
                ))}
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
