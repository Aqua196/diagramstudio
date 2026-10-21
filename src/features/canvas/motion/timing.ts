// 画布动效的时长与阈值（与 tokens.css 的 --dur-* 同一套节奏）。
// 阈值依据：受控模式下每帧 setNodes 会让 React Flow 重新接收整个节点数组，节点越多每帧越贵。
export const MOVE_MS = 320
export const UNDO_MS = 260
export const REMOTE_MS = 200
export const ENTER_MS = 380
export const POP_MS = 300
export const EXIT_MS = 220
export const CHANGED_MS = 700
export const DRAW_MS = 320

/** 画面节点超过这么多：整体不做任何补间/残影（500 节点性能门走这条） */
export const MOTION_MAX = 200
/** 一次最多这么多节点做位置补间，超过直接到位 */
export const MOVES_MAX = 120
/** 一次最多这么多节点「从源节点飞出」，其余原地弹出；弹出也有上限 */
export const FLIGHTS_MAX = 40
export const POPS_MAX = 80
export const GHOSTS_MAX = 60
/** 撤销/重做后「改了哪里」的提示圈上限 */
export const CHANGED_MAX = 30
/** 打开示例/导入时依次自绘的节点上限与总时长上限 */
export const CASCADE_MAX = 80
export const CASCADE_TOTAL_MS = 900
/** 小于这个位移不补间（避免 0.x px 抖动） */
export const MIN_MOVE_PX = 2
