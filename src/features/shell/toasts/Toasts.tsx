// 提示条系统：uiStore.toasts → 右下角堆叠，自动消退由 store 控制。
import { X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="ds-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ds-toast ds-toast-${toast.kind}`}>
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
