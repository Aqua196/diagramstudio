// 画布过程态（IMPL_CONTRACT §3）：对齐参考线、拖放连接菜单、文字编辑等
// 瞬态留在画布本地，不进 uiStore/文档。
import { create } from 'zustand'

export interface ConnectMenuState {
  /** 屏幕坐标（相对画布容器） */
  x: number
  y: number
  /** 流程坐标（新节点中心点） */
  flowX: number
  flowY: number
  /** 连接起点节点与手柄 */
  fromNodeId: string
  fromHandleId: string | null
  /** true = 拖出的线是 source 端（新节点做 target） */
  fromIsSource: boolean
}

interface CanvasStore {
  /** 正在行内编辑文字的节点 */
  editingNodeId: string | null
  /** 正在编辑标注的连线 */
  editingEdgeId: string | null
  /** 拖动节点时正悬停的改父级目标（思维导图） */
  dropTargetId: string | null
  /** 对齐参考线（流程坐标） */
  guides: { v: number[]; h: number[] }
  connectMenu: ConnectMenuState | null
  setEditingNode: (id: string | null) => void
  setEditingEdge: (id: string | null) => void
  setDropTarget: (id: string | null) => void
  setGuides: (g: { v: number[]; h: number[] }) => void
  setConnectMenu: (m: ConnectMenuState | null) => void
}

export const useCanvasStore = create<CanvasStore>()((set) => ({
  editingNodeId: null,
  editingEdgeId: null,
  dropTargetId: null,
  guides: { v: [], h: [] },
  connectMenu: null,
  setEditingNode: (editingNodeId) => set({ editingNodeId }),
  setEditingEdge: (editingEdgeId) => set({ editingEdgeId }),
  setDropTarget: (dropTargetId) => set({ dropTargetId }),
  setGuides: (guides) => set({ guides }),
  setConnectMenu: (connectMenu) => set({ connectMenu }),
}))
