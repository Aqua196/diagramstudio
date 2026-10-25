// 启动路由与浏览器前进/后退（不做 react-router）。
// - 渲染前就定好进首页还是编辑器：首屏不会先挂一个空编辑器再跳走。
// - 带 ?room= 且有协作服务：直接进编辑器，空白文档占位等远端同步（A2）；
//   没有协作服务（部署出去的静态站）就去掉参数、提示一句，按普通启动走，而不是一直「连接中」。
// - 有最近打开的文档直接回编辑器，并在它下面垫一条首页历史：返回键回首页。
import { useEffect } from 'react'
import { collabServerUrl } from '@/core/collab/server'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { getStoredDoc, lastOpenedId } from './docsStore'
import { onEditorEntry, openDocInEditor, pushEditorEntry, showHome } from './docNav'

function lastDoc() {
  const id = lastOpenedId()
  return id ? getStoredDoc(id) : null
}

function enterEditorOnBoot(): void {
  useUiStore.getState().setRoute('editor')
  if (!onEditorEntry()) {
    window.history.replaceState(null, '')
    pushEditorEntry()
  }
}

/** 在 createRoot().render 之前调用 */
export function bootRoute(): void {
  const url = new URL(window.location.href)
  if (url.searchParams.has('room')) {
    if (collabServerUrl()) return enterEditorOnBoot()
    url.searchParams.delete('room')
    window.history.replaceState(window.history.state, '', url.toString())
    useUiStore.getState().pushToast('info', zh.collab.unavailableRoom)
  }
  const doc = lastDoc()
  if (!doc) return useUiStore.getState().setRoute('home')
  useDocumentStore.getState().setDoc(doc)
  enterEditorOnBoot()
}

/** 浏览器返回/前进：在首页与编辑器之间切换（「返回首页」按钮也走这里，见 goHome） */
export function useHistoryNav(): void {
  useEffect(() => {
    const onPop = () => {
      const route = useUiStore.getState().route
      if (route === 'editor' && !onEditorEntry()) showHome()
      else if (route === 'home' && onEditorEntry()) {
        const doc = lastDoc()
        if (doc) openDocInEditor(doc, { fromHistory: true })
        else window.history.back()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
