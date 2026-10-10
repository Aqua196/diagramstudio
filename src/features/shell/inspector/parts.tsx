// 检查器共用小组件：字段行 / 开关 / 可折叠分组（C1 从 Inspector.tsx 拆出）。
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ds-field-row">
      <span className="ds-field-label">{label}</span>
      <div className="ds-field-body">{children}</div>
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="ds-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Section({
  title,
  summary,
  children,
}: {
  title: string
  summary?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="ds-group">
      <button
        type="button"
        className="ds-group-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ds-group-title">{title}</span>
        {summary && <span className="ds-group-sum">{summary}</span>}
        <ChevronDown size={13} className={`ds-group-chevron${open ? ' is-open' : ''}`} />
      </button>
      {open && <div className="ds-panel-body">{children}</div>}
    </section>
  )
}
