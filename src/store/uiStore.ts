// 非文档界面状态（IMPL_CONTRACT §3）：主题、工具、面板、选择、提示条等。
// 选择集放这里是「画布写/检查器读」的共享过程态，不进文档。
import { create } from 'zustand'
import type { ThemeName } from '@/core/palette'

export type Route = 'home' | 'editor'
export type Tool = 'select' | 'hand'

export interface Toast {
  id: string
  kind: 'info' | 'success' | 'error'
  text: string
}

export interface Selection {
  nodeIds: string[]
  edgeIds: string[]
}

interface UiStore {
  route: Route
  theme: 'light' | 'dark' | 'system'
  resolvedTheme: ThemeName
  tool: Tool
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  minimapVisible: boolean
  zoom: number
  selection: Selection
  textEditing: boolean
  toasts: Toast[]
  shortcutsHelpOpen: boolean
  lastSavedAt: number | null
  setRoute: (r: Route) => void
  setTheme: (t: 'light' | 'dark' | 'system') => void
  setTool: (t: Tool) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setMinimapVisible: (b: boolean) => void
  setZoom: (z: number) => void
  setSelection: (sel: Selection) => void
  setTextEditing: (b: boolean) => void
  pushToast: (kind: Toast['kind'], text: string) => void
  dismissToast: (id: string) => void
  setShortcutsHelpOpen: (b: boolean) => void
  setLastSavedAt: (ts: number) => void
}

const THEME_KEY = 'ds:theme'

function readStoredTheme(): 'light' | 'dark' | 'system' {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

function systemTheme(): ThemeName {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(theme: ThemeName) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

let toastSeq = 0

export const useUiStore = create<UiStore>()((set, get) => ({
  route: 'editor',
  theme: readStoredTheme(),
  resolvedTheme: 'light',
  tool: 'select',
  leftPanelOpen: true,
  rightPanelOpen: true,
  minimapVisible: false,
  zoom: 1,
  selection: { nodeIds: [], edgeIds: [] },
  textEditing: false,
  toasts: [],
  shortcutsHelpOpen: false,
  lastSavedAt: null,

  setRoute: (route) => set({ route }),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    const resolvedTheme = theme === 'system' ? systemTheme() : theme
    applyThemeClass(resolvedTheme)
    set({ theme, resolvedTheme })
  },
  setTool: (tool) => set({ tool }),
  toggleLeftPanel: () => set({ leftPanelOpen: !get().leftPanelOpen }),
  toggleRightPanel: () => set({ rightPanelOpen: !get().rightPanelOpen }),
  setMinimapVisible: (minimapVisible) => set({ minimapVisible }),
  setZoom: (zoom) => set({ zoom }),
  setSelection: (selection) => set({ selection }),
  setTextEditing: (textEditing) => set({ textEditing }),
  pushToast: (kind, text) => {
    const id = `t${++toastSeq}`
    set({ toasts: [...get().toasts, { id, kind, text }] })
    // 提示条自动消退；错误停留更久
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3000)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setShortcutsHelpOpen: (shortcutsHelpOpen) => set({ shortcutsHelpOpen }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
}))

/** 启动时初始化主题（main.tsx 调用一次）：跟随系统并监听变化 */
export function initTheme(): void {
  const apply = () => {
    const { theme } = useUiStore.getState()
    const resolved = theme === 'system' ? systemTheme() : theme
    applyThemeClass(resolved)
    if (useUiStore.getState().resolvedTheme !== resolved) {
      useUiStore.setState({ resolvedTheme: resolved })
    }
  }
  apply()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
}
