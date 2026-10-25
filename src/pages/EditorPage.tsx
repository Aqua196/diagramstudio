// 编辑器：画布铺满全屏，界面以浮动条悬在四角（左上文档、右上分享导出、左侧形状坞、
// 左下撤销缩放、右下视图设置），底部居中是上手提示。窗口宽 <1024 时整屏提示（可回首页）。
import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { ArrowLeft, MonitorSmartphone } from 'lucide-react'
import EditorCanvas from '@/features/canvas/EditorCanvas'
import { TopLeftBar } from '@/features/shell/editor/TopLeftBar'
import { TopRightBar } from '@/features/shell/editor/TopRightBar'
import { ShapeDock } from '@/features/shell/editor/ShapeDock'
import { ViewBar } from '@/features/shell/editor/ViewBar'
import { CornerBar } from '@/features/shell/editor/CornerBar'
import { HintBar } from '@/features/shell/editor/HintBar'
import { useDocumentStore } from '@/store/documentStore'
import { useCollabStore } from '@/store/collabStore'
import { goHome } from '@/features/shell/docs/docNav'
import { zh } from '@/i18n/zh'

const MIN_WIDTH = 1024

/** 窄屏：说明原因并能回首页（手机上点「看示例」进来，不能是死胡同） */
function Narrow() {
  const phone = window.matchMedia('(pointer: coarse)').matches
  return (
    <div className="ds-narrow">
      <MonitorSmartphone size={28} />
      <p className="ds-narrow-title">{phone ? zh.app.phoneTooNarrow : zh.app.windowTooNarrow}</p>
      <p className="ds-narrow-hint">
        {phone ? zh.app.phoneTooNarrowHint : zh.app.windowTooNarrowHint}
      </p>
      <button type="button" className="ds-btn ds-narrow-back" onClick={goHome}>
        <ArrowLeft size={16} /> {zh.editor.home}
      </button>
    </div>
  )
}

export default function EditorPage() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < MIN_WIDTH)
  const title = useDocumentStore((s) => s.doc.title)
  // 浮动条的入场动画只在进入编辑器时播一次（之后提示条等重新挂载不再重播）
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setEntering(false), 900)
    return () => window.clearTimeout(t)
  }, [])

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
      <div className="ds-editor" data-enter={entering || undefined}>
        {/* tabIndex=-1：从首页切进来时焦点落在画布上（键盘用户不至于掉回 body） */}
        <main className="ds-editor-canvas" tabIndex={-1}>
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
