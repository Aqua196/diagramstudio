// 导出对话框（A1）：格式 PNG/SVG、倍率、背景、可选图框标题栏（作者/版本）。
// 确认后 emit EV.EXPORT_*，具体执行在画布 useExportEvents。
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { emit, EV } from '@/core/events'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'

export type ExportFormat = 'png' | 'svg'
export type BgChoice = 'white' | 'transparent' | 'grid'

const d = zh.exportDialog

export function ExportDialog({
  format,
  onClose,
}: {
  format: ExportFormat
  onClose: () => void
}) {
  const docTitle = useDocumentStore((s) => s.doc.title)
  const [scale, setScale] = useState(2)
  const [bg, setBg] = useState<BgChoice>('white')
  const [frame, setFrame] = useState(false)
  const [author, setAuthor] = useState('')
  const [version, setVersion] = useState('V1.0')

  const confirm = () => {
    const titleblock = frame ? { author, version } : null
    if (format === 'png') emit(EV.EXPORT_PNG, { scale, background: bg, titleblock })
    else emit(EV.EXPORT_SVG, { background: bg, titleblock })
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content className="ds-dialog" aria-describedby={undefined}>
          <Dialog.Title className="ds-dialog-title">
            {format === 'png' ? d.titlePng : d.titleSvg}
          </Dialog.Title>
          <div className="ds-field-row">
            <span className="ds-field-label">{d.diagram}</span>
            <span className="ds-field-body">{docTitle}</span>
          </div>
          {format === 'png' && (
            <div className="ds-field-row">
              <span className="ds-field-label">{d.scale}</span>
              <div className="ds-field-body ds-segment" role="group" aria-label={d.scale}>
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`ds-segment-btn${scale === s ? ' is-active' : ''}`}
                    onClick={() => setScale(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="ds-field-row">
            <span className="ds-field-label">{d.background}</span>
            <div className="ds-field-body ds-segment" role="group" aria-label={d.background}>
              {(['white', 'transparent', 'grid'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`ds-segment-btn${bg === b ? ' is-active' : ''}`}
                  onClick={() => setBg(b)}
                >
                  {b === 'white' ? d.bgWhite : b === 'transparent' ? d.bgTransparent : d.bgGrid}
                </button>
              ))}
            </div>
          </div>
          <label className="ds-check">
            <input
              type="checkbox"
              checked={frame}
              onChange={(e) => setFrame(e.target.checked)}
            />
            {d.frame}
          </label>
          {frame && (
            <>
              <div className="ds-field-row">
                <span className="ds-field-label">{d.author}</span>
                <input
                  className="ds-input ds-field-body"
                  value={author}
                  aria-label={d.author}
                  onChange={(e) => setAuthor(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div className="ds-field-row">
                <span className="ds-field-label">{d.version}</span>
                <input
                  className="ds-input ds-field-body"
                  value={version}
                  aria-label={d.version}
                  onChange={(e) => setVersion(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </>
          )}
          <div className="ds-dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="ds-btn">
                {zh.common.cancel}
              </button>
            </Dialog.Close>
            <button type="button" className="ds-btn ds-btn-primary" onClick={confirm}>
              {d.confirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
