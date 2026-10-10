// 编辑器骨架：顶栏 48px + 左 240px 形状库 + 画布 + 右 280px 检查器。
// 窗口宽 <1024 时整屏提示（SPEC §6 最小 1280×720 桌面优先）。
import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import EditorCanvas from '@/features/canvas/EditorCanvas'
import { TopBar } from '@/features/shell/topbar/TopBar'
import { LeftPanel } from '@/features/shell/palette/LeftPanel'
import { Inspector } from '@/features/shell/inspector/Inspector'
import { useUiStore } from '@/store/uiStore'
import { useDocumentStore } from '@/store/documentStore'
import { useCollabStore } from '@/store/collabStore'
import { zh } from '@/i18n/zh'

const MIN_WIDTH = 1024

export default function EditorPage() {
  const leftPanelOpen = useUiStore((s) => s.leftPanelOpen)
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen)
  const [narrow, setNarrow] = useState(() => window.innerWidth < MIN_WIDTH)
  const doc = useDocumentStore((s) => s.doc)

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < MIN_WIDTH)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ?room= 参数自动加入协作（A2）
  useEffect(() => {
    useCollabStore.getState().initFromUrl()
  }, [])

  if (narrow) {
    return (
      <div className="ds-narrow">
        <p>{zh.app.windowTooNarrow}</p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="ds-editor">
        <TopBar />
        <div className="ds-editor-body">
          {leftPanelOpen && <LeftPanel />}
          <main className="ds-editor-canvas">
            <h1 className="sr-only">{doc.title}</h1>
            <EditorCanvas />
          </main>
          {rightPanelOpen && <Inspector />}
        </div>
      </div>
    </ReactFlowProvider>
  )
}
