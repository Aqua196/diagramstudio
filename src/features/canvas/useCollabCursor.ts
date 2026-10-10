// 画布协作光标 + 调试桥接线（C1 从 EditorCanvas 拆出）：
// onPointerMove → flow 坐标推给 collabStore（节流在 adapter 内）；leave → null。
import { useEffect } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { useCollabStore } from '@/store/collabStore'

export function useCollabCursor(rf: ReactFlowInstance): {
  onPointerMove: (e: React.PointerEvent) => void
  onPointerLeave: () => void
} {
  // 调试桥 __ds.rf 仅在 dev/显式 debug 包启用（A6，静态条件可 tree-shake）
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.VITE_DS_DEBUG === '1') {
      const w = window as unknown as { __ds?: { rf?: unknown } }
      ;(w.__ds ??= {}).rf = rf
    }
  }, [rf])
  return {
    onPointerMove: (e) => {
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      useCollabStore.getState().pushCursor(pos)
    },
    onPointerLeave: () => useCollabStore.getState().pushCursor(null),
  }
}
