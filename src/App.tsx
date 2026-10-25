// 应用外壳：按 uiStore.route 在首页与编辑器之间切换（不做 react-router）。
// 启动时进哪一页由 main.tsx 里的 bootRoute() 在渲染前决定；AppEffects 挂载全局事件、快捷键与前进/后退。
import * as Tooltip from '@radix-ui/react-tooltip'
import HomePage from '@/pages/HomePage'
import EditorPage from '@/pages/EditorPage'
import { useDocEvents } from '@/features/shell/docs/useDocEvents'
import { useGlobalShortcuts } from '@/features/shell/shortcuts/keys'
import { Toasts } from '@/features/shell/toasts/Toasts'
import { ShortcutsDialog } from '@/features/shell/shortcuts/ShortcutsDialog'
import { useUiStore } from '@/store/uiStore'
import { useHistoryNav } from '@/features/shell/docs/boot'

function AppEffects() {
  useDocEvents()
  useHistoryNav()
  useGlobalShortcuts()
  return null
}

export default function App() {
  const route = useUiStore((s) => s.route)

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={150}>
      <AppEffects />
      {route === 'editor' ? <EditorPage /> : <HomePage />}
      <Toasts />
      <ShortcutsDialog />
    </Tooltip.Provider>
  )
}
