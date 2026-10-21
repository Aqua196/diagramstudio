// 单节点工具条：颜色 · 字号 · 加粗 · 编辑文字 · 插件动作（加子主题/加字段）· 更多 · 删除。
import { Bold, Pencil, Trash2, Type } from 'lucide-react'
import { patchNodeStyle } from '@/core/commands/ops'
import { emit, EV } from '@/core/events'
import type { DiagramNode } from '@/core/model/types'
import type { ReactPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { executeAndFocus } from '../focus'
import { ColorDot, ColorGrid, FontSizeSeg, PopButton } from './parts'
import { NodeMore } from './NodeMore'

const t = zh.toolbar

function PluginActions({ plugin }: { plugin: ReactPlugin }) {
  if (!plugin.nodeActions?.length) return null
  const run = (fn: NonNullable<ReactPlugin['nodeActions']>[number]['run']) => {
    const doc = useDocumentStore.getState().doc
    const cmd = fn({ doc, selection: useUiStore.getState().selection, dispatchEvent: () => {} })
    if (cmd) executeAndFocus(cmd)
  }
  return (
    <>
      {plugin.nodeActions.map((a) => (
        <IconButton
          key={a.id}
          icon={a.icon}
          label={a.label}
          kbd={a.kbd}
          tipSide="top"
          onClick={() => run(a.run)}
        />
      ))}
      <span className="ds-sep" />
    </>
  )
}

export function NodeToolbarContent({ node, plugin }: { node: DiagramNode; plugin: ReactPlugin }) {
  const execute = useDocumentStore((s) => s.execute)
  const style = (p: Parameters<typeof patchNodeStyle>[1], label: string) =>
    execute(patchNodeStyle(node.id, p, label))
  return (
    <>
      <PopButton label={t.color} icon={<ColorDot fill={node.style.fill} />}>
        <ColorGrid value={node.style.fill} onPick={(k) => style({ fill: k }, '修改颜色')} />
      </PopButton>
      <PopButton label={t.fontSize} icon={<Type size={16} />}>
        <FontSizeSeg
          value={node.style.fontSize}
          onPick={(n) => style({ fontSize: n }, '修改字号')}
        />
      </PopButton>
      <IconButton
        icon={<Bold size={16} />}
        label={t.bold}
        tipSide="top"
        aria-pressed={node.style.bold}
        onClick={() => style({ bold: !node.style.bold }, '修改样式')}
      />
      <IconButton
        icon={<Pencil size={16} />}
        label={t.editText}
        kbd="F2"
        tipSide="top"
        onClick={() => emit(EV.EDIT_TEXT)}
      />
      <span className="ds-sep" />
      <PluginActions plugin={plugin} />
      <NodeMore node={node} />
      <IconButton
        icon={<Trash2 size={16} />}
        label={t.delete}
        kbd="Del"
        tipSide="top"
        danger
        onClick={() => emit(EV.DELETE)}
      />
    </>
  )
}
