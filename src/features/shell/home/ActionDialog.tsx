// 通用确认/表单对话框（C1 从 DocCard 拆出，可在 shell 复用）。
import * as Dialog from '@radix-ui/react-dialog'
import { zh } from '@/i18n/zh'

export function ActionDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  body: React.ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content className="ds-dialog" aria-describedby={undefined}>
          <Dialog.Title className="ds-dialog-title">{title}</Dialog.Title>
          {body}
          <div className="ds-dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="ds-btn">
                {zh.common.cancel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              className={`ds-btn ${danger ? 'ds-btn-danger' : 'ds-btn-primary'}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
