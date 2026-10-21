// 提示条系统：uiStore.toasts → 底部居中的胶囊堆叠，自动消退由 store 控制。
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

const ICONS = {
  success: <CircleCheck size={16} />,
  error: <CircleAlert size={16} />,
  info: <Info size={16} />,
} as const

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  return (
    <div className="ds-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ds-toast ds-toast-${toast.kind}${toast.leaving ? ' is-leaving' : ''}`}>
          <span className="ds-toast-icon">{ICONS[toast.kind]}</span>
          <span>{toast.text}</span>
          <button
            type="button"
            className="ds-toast-close"
            aria-label={zh.common.close}
            onClick={() => dismiss(toast.id)}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
