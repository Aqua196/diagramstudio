// 开关行：左侧文字、右侧滑动开关（role=switch，键盘空格可切换）。
interface Props {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

export function SwitchRow({ label, checked, onChange }: Props) {
  return (
    <label className="ds-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="ds-switch"
        onClick={() => onChange(!checked)}
      />
    </label>
  )
}
