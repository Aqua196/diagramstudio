// 右侧检查器 280px：随 selection 切换画布设置 / 节点 / 连线 / 多选面板。
import { emit, EV } from '@/core/events'
import { setSettings } from '@/core/commands/ops'
import { selectSelectedEdges, selectSelectedNodes } from '@/store/selectors'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { EdgeInspector } from './EdgeInspector'
import { MultiInspector, NodeInspector } from './NodeInspector'
import { Section, Toggle, Row } from './parts'

const t = zh.inspector

function CanvasSettings() {
  const settings = useDocumentStore((s) => s.doc.settings)
  const execute = useDocumentStore((s) => s.execute)
  const minimapVisible = useUiStore((s) => s.minimapVisible)
  const setMinimapVisible = useUiStore((s) => s.setMinimapVisible)
  const onoff = (v: boolean) => (v ? '开' : '关')
  return (
    <Section
      title={t.canvasSettings}
      summary={`${t.grid}${onoff(settings.grid)}·${t.snap}${onoff(settings.snap)}`}
    >
      <Toggle
        label={t.grid}
        checked={settings.grid}
        onChange={(v) => execute(setSettings({ grid: v }))}
      />
      <Toggle
        label={t.snap}
        checked={settings.snap}
        onChange={(v) => execute(setSettings({ snap: v }))}
      />
      <Toggle label={t.minimap} checked={minimapVisible} onChange={setMinimapVisible} />
      <Row label={t.direction}>
        <div className="ds-segment">
          {(['TB', 'LR'] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`ds-segment-btn${settings.layoutDirection === d ? ' is-active' : ''}`}
              onClick={() => execute(setSettings({ layoutDirection: d }, t.direction))}
            >
              {d === 'TB' ? t.dirTB : t.dirLR}
            </button>
          ))}
        </div>
      </Row>
      <button
        type="button"
        className="ds-btn ds-btn-wide"
        onClick={() => emit(EV.AUTO_LAYOUT, settings.layoutDirection)}
      >
        {t.autoLayout}
      </button>
    </Section>
  )
}

export function Inspector() {
  const doc = useDocumentStore((s) => s.doc)
  const sel = useUiStore((s) => s.selection)
  const nodes = selectSelectedNodes(doc, sel)
  const edges = selectSelectedEdges(doc, sel)
  return (
    <aside className="ds-panel ds-panel-right" aria-label={zh.topbar.rightPanel}>
      {nodes.length === 1 && edges.length === 0 && <NodeInspector ids={sel.nodeIds} />}
      {nodes.length > 1 && <MultiInspector count={nodes.length} />}
      {nodes.length === 0 && edges.length >= 1 && <EdgeInspector ids={sel.edgeIds} />}
      {nodes.length === 0 && edges.length === 0 && <CanvasSettings />}
    </aside>
  )
}
