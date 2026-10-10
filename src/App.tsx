// 应用外壳：按 uiStore.route 在首页与编辑器之间切换（不做 react-router）。
// AppEffects 挂载全局事件监听与快捷键总线。
import { useEffect } from 'react'
import HomePage from '@/pages/HomePage'
import EditorPage from '@/pages/EditorPage'
import { useDocEvents } from '@/features/shell/docs/useDocEvents'
import { useGlobalShortcuts } from '@/features/shell/shortcuts/keys'
import { Toasts } from '@/features/shell/toasts/Toasts'
import { ShortcutsDialog } from '@/features/shell/shortcuts/ShortcutsDialog'
import { useUiStore } from '@/store/uiStore'
import { lastOpenedId, getStoredDoc } from '@/features/shell/docs/docsStore'
import { useDocumentStore } from '@/store/documentStore'

function AppEffects() {
  useDocEvents()
  useGlobalShortcuts()
  return null
}

export default function App() {
  const route = useUiStore((s) => s.route)

  // 启动路由：?room= 直接进编辑器（空白文档占位等远端同步，A2）；
  // 有最近打开的文档直接回编辑器，否则进首页
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('room')) {
      useUiStore.getState().setRoute('editor')
      return
    }
    const id = lastOpenedId()
    const doc = id ? getStoredDoc(id) : null
    if (doc) {
      useDocumentStore.getState().setDoc(doc)
      useUiStore.getState().setRoute('editor')
    } else {
      useUiStore.getState().setRoute('home')
    }
  }, [])

  return (
    <>
      <AppEffects />
      {route === 'editor' ? <EditorPage /> : <HomePage />}
      <Toasts />
      <ShortcutsDialog />
    </>
  )
}
