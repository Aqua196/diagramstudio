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
const BG_LABELS: Record<BgChoice, string> = {
  white: d.bgWhite,
  transparent: d.bgTransparent,
  grid: d.bgGrid,
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ds-field-row">
      <span className="ds-field-label">{label}</span>
      <span className="ds-field-body">{children}</span>
    </div>
  )
}

function Segment<T extends string | number>({
  label,
  options,
  value,
  names,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  names: (v: T) => string
  onChange: (v: T) => void
}) {
  return (
    <FieldRow label={label}>
      <div className="ds-segment" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            className={`ds-segment-btn${value === o ? ' is-active' : ''}`}
            onClick={() => onChange(o)}
          >
            {names(o)}
          </button>
        ))}
      </div>
    </FieldRow>
  )
}

function FrameFields({
  author,
  version,
  onAuthor,
  onVersion,
}: {
  author: string
  version: string
  onAuthor: (v: string) => void
  onVersion: (v: string) => void
}) {
  return (
    <>
      <FieldRow label={d.author}>
        <input
          className="ds-input ds-field-body"
          value={author}
          aria-label={d.author}
          onChange={(e) => onAuthor(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </FieldRow>
      <FieldRow label={d.version}>
        <input
          className="ds-input ds-field-body"
          value={version}
          aria-label={d.version}
          onChange={(e) => onVersion(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </FieldRow>
    </>
  )
}

function DialogFrame({
  title,
  onClose,
  onConfirm,
  children,
}: {
  title: string
  onClose: () => void
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content className="ds-dialog" aria-describedby={undefined}>
          <Dialog.Title className="ds-dialog-title">{title}</Dialog.Title>
          {children}
          <div className="ds-dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="ds-btn">
                {zh.common.cancel}
              </button>
            </Dialog.Close>
            <button type="button" className="ds-btn ds-btn-primary" onClick={onConfirm}>
              {d.confirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface FormState {
  scale: number
  setScale: (v: number) => void
  bg: BgChoice
  setBg: (v: BgChoice) => void
  frame: boolean
  setFrame: (v: boolean) => void
  author: string
  setAuthor: (v: string) => void
  version: string
  setVersion: (v: string) => void
}

function useExportForm(format: ExportFormat, onClose: () => void): { form: FormState; confirm: () => void } {
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
  return { form: { scale, setScale, bg, setBg, frame, setFrame, author, setAuthor, version, setVersion }, confirm }
}

export function ExportDialog({ format, onClose }: { format: ExportFormat; onClose: () => void }) {
  const docTitle = useDocumentStore((s) => s.doc.title)
  const { form, confirm } = useExportForm(format, onClose)
  return (
    <DialogFrame
      title={format === 'png' ? d.titlePng : d.titleSvg}
      onClose={onClose}
      onConfirm={confirm}
    >
      <FieldRow label={d.diagram}>{docTitle}</FieldRow>
      {format === 'png' && (
        <Segment
          label={d.scale}
          options={[1, 2, 3] as const}
          value={form.scale}
          names={(s) => `${s}x`}
          onChange={form.setScale}
        />
      )}
      <Segment
        label={d.background}
        options={['white', 'transparent', 'grid'] as const}
        value={form.bg}
        names={(b) => BG_LABELS[b]}
        onChange={form.setBg}
      />
      <label className="ds-check">
        <input
          type="checkbox"
          checked={form.frame}
          onChange={(e) => form.setFrame(e.target.checked)}
        />
        {d.frame}
      </label>
      {form.frame && (
        <FrameFields
          author={form.author}
          version={form.version}
          onAuthor={form.setAuthor}
          onVersion={form.setVersion}
        />
      )}
    </DialogFrame>
  )
}
