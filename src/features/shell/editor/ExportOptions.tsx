// 导出对话框的表单件：格式卡片、分段选择、图片选项（清晰度/背景/图框标题栏）与表单状态。
import { useState } from 'react'
import { FileCode2, FileImage, FileJson, Workflow } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { zh } from '@/i18n/zh'
import { SwitchRow } from '@/components/Switch'

const d = zh.exportDialog
type Format = 'png' | 'svg' | 'json' | 'mermaid'
type Bg = 'white' | 'transparent' | 'grid'

const FORMATS: Array<[Format, string, string, React.ReactNode]> = [
  ['png', d.png, d.pngDesc, <FileImage key="p" size={20} />],
  ['svg', d.svg, d.svgDesc, <FileCode2 key="s" size={20} />],
  ['json', d.json, d.jsonDesc, <FileJson key="j" size={20} />],
  ['mermaid', d.mermaid, d.mermaidDesc, <Workflow key="m" size={20} />],
]
const BGS: Array<[Bg, string]> = [
  ['white', d.bgWhite],
  ['transparent', d.bgTransparent],
  ['grid', d.bgGrid],
]

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<[T, string]>
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="ds-seg ds-seg-block" role="group" aria-label={label}>
      {options.map(([v, name]) => (
        <button
          key={String(v)}
          type="button"
          className={`ds-seg-btn${value === v ? ' is-active' : ''}`}
          onClick={() => onChange(v)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

export function FormatCards({
  value,
  onChange,
  mermaidOk,
}: {
  value: Format
  onChange: (f: Format) => void
  mermaidOk: boolean
}) {
  return (
    <div className="ds-format-grid" role="radiogroup" aria-label={d.format}>
      {FORMATS.map(([f, name, desc, icon]) => {
        const disabled = f === 'mermaid' && !mermaidOk
        return (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={value === f}
            disabled={disabled}
            className={`ds-format${value === f ? ' is-active' : ''}`}
            onClick={() => onChange(f)}
          >
            <span className="ds-format-icon">{icon}</span>
            <span className="ds-format-name">{name}</span>
            <span className="ds-format-desc">{disabled ? d.mermaidOnly : desc}</span>
          </button>
        )
      })}
    </div>
  )
}

export function useExportForm(onClose: () => void) {
  const [format, setFormat] = useState<Format>('png')
  const [scale, setScale] = useState(2)
  const [bg, setBg] = useState<Bg>('white')
  const [frame, setFrame] = useState(false)
  const [author, setAuthor] = useState('')
  const [version, setVersion] = useState('V1.0')
  const confirm = () => {
    const titleblock = frame ? { author, version } : null
    if (format === 'png') emit(EV.EXPORT_PNG, { scale, background: bg, titleblock })
    else if (format === 'svg') emit(EV.EXPORT_SVG, { background: bg, titleblock })
    else if (format === 'json') emit(EV.EXPORT_JSON)
    else emit(EV.EXPORT_MERMAID)
    onClose()
  }
  return {
    format,
    setFormat,
    scale,
    setScale,
    bg,
    setBg,
    frame,
    setFrame,
    author,
    setAuthor,
    version,
    setVersion,
    confirm,
  }
}

export type Form = ReturnType<typeof useExportForm>

export function ImageOptions({ f }: { f: Form }) {
  return (
    <div className="ds-export-opts">
      {f.format === 'png' && (
        <div className="ds-field">
          <span className="ds-label">{d.scale}</span>
          <Seg
            label={d.scale}
            options={[
              [1, '1x'],
              [2, '2x'],
              [3, '3x'],
            ]}
            value={f.scale}
            onChange={f.setScale}
          />
        </div>
      )}
      <div className="ds-field">
        <span className="ds-label">{d.background}</span>
        <Seg label={d.background} options={BGS} value={f.bg} onChange={f.setBg} />
      </div>
      <div className="ds-field">
        <SwitchRow label={d.frame} checked={f.frame} onChange={f.setFrame} />
        <span className="ds-field-hint">{d.frameHint}</span>
      </div>
      {f.frame && (
        <div className="ds-grid-2">
          <label className="ds-field">
            <span className="ds-label">{d.author}</span>
            <input
              className="ds-input"
              value={f.author}
              placeholder={d.authorPlaceholder}
              onChange={(e) => f.setAuthor(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </label>
          <label className="ds-field">
            <span className="ds-label">{d.version}</span>
            <input
              className="ds-input"
              value={f.version}
              onChange={(e) => f.setVersion(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </label>
        </div>
      )}
    </div>
  )
}
