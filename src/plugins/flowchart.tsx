// 流程图插件（SPEC §3.1）：10 种形状 + dagre 布局 + 内置模板 + 快捷添加规则。
import type { ReactNode } from 'react'
import { dagreLayout } from '@/core/layout/dagre'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'
import type { DiagramPlugin, ShapeDef } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import { shapePaths } from './shapePaths'
import { shapeIcons } from './shapeIcons'

const sh = zh.plugins.shapes

type Spec = [kind: keyof typeof sh, w: number, h: number, render: ShapeDef<ReactNode>['render']]

const SPECS: Spec[] = [
  ['process', 140, 56, shapePaths.rect],
  ['terminator', 140, 48, shapePaths.rounded],
  ['decision', 140, 84, shapePaths.diamond],
  ['io', 140, 56, shapePaths.parallelogram],
  ['subprocess', 150, 56, shapePaths.subprocess],
  ['database', 120, 76, shapePaths.cylinder],
  ['document', 140, 64, shapePaths.document],
  ['connector', 36, 36, shapePaths.circle],
  ['terminator2', 140, 48, shapePaths.doubleCircle],
  ['note', 150, 80, shapePaths.note],
]

export const flowchartShapes: ShapeDef<ReactNode>[] = SPECS.map(([kind, w, h, render]) => ({
  kind,
  name: sh[kind],
  icon: shapeIcons[kind],
  defaultSize: { w, h },
  render,
}))

/** 模板（B6）：用户登录流程 —— 含失败回环与错误次数锁定。
 *  主链居中一列、失败支路在左列；两条回环用显式锚点走外侧，折线互不交叉。 */
function loginTemplate(): DiagramDoc {
  const doc = createDoc('flowchart', zh.templates.flowchart)
  const mk = (kind: string, text: string, cx: number, y: number) => {
    const size = flowchartShapes.find((s) => s.kind === kind)?.defaultSize ?? { w: 140, h: 56 }
    return createNode(kind, { x: cx - size.w / 2, y }, { ...size }, text)
  }
  const start = mk('terminator', '开始', 320, 0)
  const input = mk('io', '输入账号密码', 320, 100)
  const format = mk('decision', '校验格式', 320, 206)
  const query = mk('database', '查询用户数据库', 320, 340)
  const pwdOk = mk('decision', '密码正确？', 320, 466)
  const session = mk('process', '生成会话', 320, 610)
  const home = mk('process', '进入主页', 320, 716)
  const end = mk('terminator', '结束', 320, 822)
  const fail = mk('process', '错误次数 +1', 60, 480)
  const lock = mk('decision', '错误 ≥3 次？', 60, 596)
  const locked = mk('terminator', '锁定账号', 60, 740)
  start.style.fill = 'teal'
  end.style.fill = 'teal'
  locked.style.fill = 'pink'
  for (const n of [format, pwdOk, lock]) n.style.fill = 'yellow'
  query.style.fill = 'blue'
  const nodes = [start, input, format, query, pwdOk, session, home, end, fail, lock, locked]
  for (const n of nodes) doc.nodes[n.id] = n
  doc.zOrder = nodes.map((n) => n.id)
  const e = (a: string, b: string, extra?: Parameters<typeof createEdge>[2]) =>
    createEdge(a, b, { routing: 'step', ...extra })
  const edges = [
    e(start.id, input.id),
    e(input.id, format.id),
    e(format.id, query.id, { label: '通过' }),
    e(format.id, fail.id, { label: '不通过', sourceHandle: 'left', targetHandle: 'top' }),
    e(query.id, pwdOk.id),
    e(pwdOk.id, session.id, { label: '正确' }),
    e(pwdOk.id, fail.id, { label: '错误', sourceHandle: 'left', targetHandle: 'right' }),
    e(fail.id, lock.id),
    e(lock.id, input.id, { label: '否，重试', sourceHandle: 'left', targetHandle: 'left' }),
    e(lock.id, locked.id, { label: '是' }),
    e(session.id, home.id),
    e(home.id, end.id),
  ]
  for (const ed of edges) doc.edges[ed.id] = ed
  return doc
}

/** 快捷添加的下一步：起止/判断/连接点之后通常接「处理」，其余沿用同形状 */
const AFTER_TO_PROCESS = new Set(['terminator', 'terminator2', 'decision', 'connector'])

export const flowchartPlugin: DiagramPlugin<ReactNode> = {
  type: 'flowchart',
  shapes: flowchartShapes,
  edgeDefaults: {
    routing: 'step',
    arrowStart: 'none',
    arrowEnd: 'arrow',
    style: { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
  },
  layout: dagreLayout,
  nextKind: (kind) => (AFTER_TO_PROCESS.has(kind) ? 'process' : kind),
  tips: zh.plugins.tips.flowchart,
  templates: [loginTemplate()],
}
