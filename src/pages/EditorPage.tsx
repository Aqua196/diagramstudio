// 编辑器：画布铺满全屏，界面以浮动条悬在四角（左上文档、右上分享导出、左侧形状坞、
// 左下撤销缩放、右下视图设置），底部居中是上手提示。窗口宽 <1024 时整屏提示。
import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { MonitorSmartphone } from 'lucide-react'
import EditorCanvas from '@/features/canvas/EditorCanvas'
import { TopLeftBar } from '@/features/shell/editor/TopLeftBar'
import { TopRightBar } from '@/features/shell/editor/TopRightBar'
import { ShapeDock } from '@/features/shell/editor/ShapeDock'
import { ViewBar } from '@/features/shell/editor/ViewBar'
import { CornerBar } from '@/features/shell/editor/CornerBar'
import { HintBar } from '@/features/shell/editor/HintBar'
import { useDocumentStore } from '@/store/documentStore'
import { useCollabStore } from '@/store/collabStore'
import { zh } from '@/i18n/zh'

const MIN_WIDTH = 1024

function Narrow() {
  return (
    <div className="ds-narrow">
      <MonitorSmartphone size={28} />
      <p className="ds-narrow-title">{zh.app.windowTooNarrow}</p>
      <p className="ds-narrow-hint">{zh.app.windowTooNarrowHint}</p>
    </div>
  )
}

export default function EditorPage() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < MIN_WIDTH)
  const title = useDocumentStore((s) => s.doc.title)

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < MIN_WIDTH)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ?room= 参数自动加入协作（A2）
  useEffect(() => {
    useCollabStore.getState().initFromUrl()
  }, [])

  if (narrow) return <Narrow />

  return (
    <ReactFlowProvider>
      <div className="ds-editor">
        <main className="ds-editor-canvas">
          <h1 className="sr-only">{title}</h1>
          <EditorCanvas />
        </main>
        <TopLeftBar />
        <TopRightBar />
        <ShapeDock />
        <ViewBar />
        <CornerBar />
        <HintBar />
      </div>
    </ReactFlowProvider>
  )
}
