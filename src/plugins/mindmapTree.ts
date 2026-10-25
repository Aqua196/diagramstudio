// 思维导图纯逻辑：父子关系、子树展开、分支配色（B2/B3）、模板（B6）。
// 与 mindmap.tsx（渲染）分离，保证两个文件都不超 200 行。
import { addNode } from '@/core/commands/ops'
import type { Command } from '@/core/commands/command'
import { mindmapRootId } from '@/core/layout/mindmap'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode } from '@/core/model/types'
import { zh } from '@/i18n/zh'

export interface MindData {
  parentId?: string | null
  collapsed?: boolean
}

export const mindData = (n: DiagramNode): MindData => n.data as MindData

export const childrenOf = (doc: DiagramDoc, id: string): string[] =>
  doc.zOrder.filter((z) => {
    const n: DiagramNode | undefined = doc.nodes[z]
    return !!n && mindData(n).parentId === id
  })

/** 是否为 ancestor 的后代（防止拖成环、删除子树用） */
export function isDescendant(doc: DiagramDoc, maybeChild: string, ancestor: string): boolean {
  let cur: string | null = maybeChild
  while (cur) {
    if (cur === ancestor) return true
    const n: DiagramNode | undefined = doc.nodes[cur]
    cur = n ? (mindData(n).parentId ?? null) : null
  }
  return false
}

/** expandDeletion：所选节点及其全部后代；根（parentId=null）不可删，过滤掉 */
export function expandMindmapDeletion(doc: DiagramDoc, nodeIds: string[]): string[] {
  const out = new Set<string>()
  const walk = (id: string) => {
    const n = doc.nodes[id]
    if (!n || mindData(n).parentId == null) return
    out.add(id)
    for (const cid of childrenOf(doc, id)) walk(cid)
  }
  for (const id of nodeIds) walk(id)
  return doc.zOrder.filter((id) => out.has(id))
}

// —— 分支配色（B3）：一级分支按 BRANCH_COLORS 轮换，深层继承父级 ——
export const BRANCH_COLORS = ['teal', 'blue', 'yellow', 'pink', 'purple', 'gray'] as const

/** 节点所属一级分支的分支色；自身即一级分支时返回自身应得的色 */
export function branchColorOf(doc: DiagramDoc, id: string): string | null {
  const rootId = mindmapRootId(doc)
  let cur: string | null = id
  while (cur) {
    const n: DiagramNode | undefined = doc.nodes[cur]
    if (!n) return null
    const p: string | null = mindData(n).parentId ?? null
    if (p === null) return null // 已走到根：id 在根链上
    if (p === rootId) {
      const kids = childrenOf(doc, rootId)
      const idx = kids.indexOf(cur)
      return BRANCH_COLORS[(idx >= 0 ? idx : kids.length) % BRANCH_COLORS.length]
    }
    cur = p
  }
  return null
}

/** 新子节点应得的填充色：父是根 → 轮换色；否则继承父节点 fill */
export function colorForNewChild(doc: DiagramDoc, parentId: string | null): string | null {
  if (parentId === null) return null
  const rootId = mindmapRootId(doc)
  if (parentId === rootId) {
    const idx = childrenOf(doc, parentId).length
    return BRANCH_COLORS[idx % BRANCH_COLORS.length]
  }
  return doc.nodes[parentId]?.style.fill ?? null
}

/** 改父级命令：若节点 fill 等于旧分支色，则换为新分支色并同步子树 */
export function reparentCommand(
  doc: DiagramDoc,
  draggedId: string,
  targetId: string,
): Command | null {
  if (draggedId === targetId) return null
  const dragged = doc.nodes[draggedId]
  if (!dragged || !doc.nodes[targetId]) return null
  if (mindData(dragged).parentId == null) return null // 根节点不可改父级
  if (isDescendant(doc, targetId, draggedId)) return null // 不能拖进自己的子树

  const oldColor = branchColorOf(doc, draggedId)
  const targetIsRoot =
    mindData(doc.nodes[targetId]).parentId == null && targetId === mindmapRootId(doc)
  const newColor = targetIsRoot ? colorForNewChild(doc, targetId) : doc.nodes[targetId].style.fill

  return {
    label: zh.plugins.mindmap.reparent,
    apply(draft) {
      const n = draft.nodes[draggedId]
      if (!n) return
      const recolor = oldColor !== null && n.style.fill === oldColor && newColor !== null
      n.data = { ...mindData(n), parentId: targetId }
      if (recolor) {
        const recolorSubtree = (id: string) => {
          const node = draft.nodes[id]
          if (!node) return
          if (node.style.fill === oldColor) node.style.fill = newColor
          for (const cid of childrenOf(draft, id)) recolorSubtree(cid)
        }
        recolorSubtree(draggedId)
      }
    },
  }
}

export function mkChild(doc: DiagramDoc, parentId: string | null): Command {
  // 先放在父节点处，随后的自动布局把它推到落点：画面上就是从父节点里长出来
  const parent = parentId ? doc.nodes[parentId] : undefined
  const at = parent ? { x: parent.position.x, y: parent.position.y } : { x: 0, y: 0 }
  const child = createNode('topic', at, { w: 140, h: 40 }, zh.plugins.mindmap.newTopic)
  child.data = { parentId }
  const fill = colorForNewChild(doc, parentId)
  if (fill) child.style.fill = fill
  return addNode(child)
}

// —— 模板（B6）：软件工程知识点，分支按 BRANCH_COLORS 着色 ——
const MINDMAP_TPL: Array<[string, string[]]> = [
  ['需求工程', ['需求获取', '用例建模', '需求规格说明']],
  ['软件设计', ['体系结构风格', '设计模式', '面向对象设计']],
  ['软件测试', ['单元测试', '集成测试', '系统测试']],
  ['项目管理', ['敏捷开发', '配置管理', '风险管理']],
  ['软件维护', ['重构', '版本演进']],
]

export function mindmapTemplate(): DiagramDoc {
  const doc = createDoc('mindmap', zh.templates.mindmap)
  const root = createNode('centerTopic', { x: 0, y: 0 }, { w: 180, h: 60 }, zh.templates.mindmap)
  root.data = { parentId: null }
  doc.nodes[root.id] = root
  doc.zOrder = [root.id]
  MINDMAP_TPL.forEach(([branch, leaves], i) => {
    const b = createNode('topic', { x: 0, y: 0 }, { w: 140, h: 40 }, branch)
    b.data = { parentId: root.id }
    b.style.fill = BRANCH_COLORS[i % BRANCH_COLORS.length]
    doc.nodes[b.id] = b
    doc.zOrder.push(b.id)
    for (const leaf of leaves) {
      const l = createNode('topic', { x: 0, y: 0 }, { w: 140, h: 40 }, leaf)
      l.data = { parentId: b.id }
      l.style.fill = b.style.fill
      doc.nodes[l.id] = l
      doc.zOrder.push(l.id)
    }
  })
  return doc
}
