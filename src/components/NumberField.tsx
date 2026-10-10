// 数字输入：检查器里尺寸/位置/字号/描边共用的小输入框。
import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onCommit: (v: number) => void
}

/** 提交式数字框：失焦或 Enter 才回调，避免每次击键都生成历史条目 */
export function NumberField({ label, value, min, max, step = 1, onCommit }: Props) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(Math.round(value * 100) / 100)), [value])

  const commit = () => {
    const v = Number(draft)
    if (!Number.isFinite(v)) {
      setDraft(String(value))
      return
    }
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
    if (clamped !== value) onCommit(clamped)
    else setDraft(String(clamped))
  }

  return (
    <label className="ds-num-field">
      <span className="ds-field-label">{label}</span>
      <input
        className="ds-input ds-input-num"
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          e.stopPropagation()
        }}
      />
    </label>
  )
}
