// 导出对话框（A1）：先选格式（四张卡片），图片格式再选清晰度/背景/图框标题栏。
// 确认后 emit EV.EXPORT_*，执行在画布 useExportEvents / 外壳 docIoHandlers。
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { FormatCards, ImageOptions, useExportForm } from './ExportOptions'

const d = zh.exportDialog

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const type = useDocumentStore((s) => s.doc.type)
  const title = useDocumentStore((s) => s.doc.title)
  const f = useExportForm(onClose)
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content className="ds-dialog ds-dialog-wide">
          <div className="ds-dialog-head">
            <div>
              <Dialog.Title className="ds-dialog-title">{d.title}</Dialog.Title>
              <Dialog.Description className="ds-dialog-desc">{title}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ds-icon-btn" aria-label={zh.common.close}>
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <FormatCards value={f.format} onChange={f.setFormat} mermaidOk={type === 'flowchart'} />
          {(f.format === 'png' || f.format === 'svg') && <ImageOptions f={f} />}
          <div className="ds-dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="ds-btn">
                {zh.common.cancel}
              </button>
            </Dialog.Close>
            <button type="button" className="ds-btn ds-btn-primary" onClick={f.confirm}>
              {d.confirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
