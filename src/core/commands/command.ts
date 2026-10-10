// 命令契约（SPEC §4）：文档的一切修改都经 history.execute(command) 提交。
// apply 直接改 immer draft，历史层负责收补丁与逆补丁。
import type { DiagramDoc } from '../model/types'

export interface Command {
  /** 撤销提示展示的文字，如「移动 3 个元素」 */
  label: string
  /** 相同 key 且间隔 <600ms 的连续命令合并为一条历史（拖动、连续打字） */
  coalesceKey?: string
  /** true 且历史栈非空时无条件并入栈顶（如自动布局跟随上一条命令） */
  mergeWithPrevious?: boolean
  apply: (draft: DiagramDoc) => void
}
