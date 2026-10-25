// 导出事件监听（A1）：EV.EXPORT_PNG / EV.EXPORT_SVG → 计算覆盖全部节点的
// 视口 transform 后交给 src/io/export.ts；成功/失败各吐一条 toast。
import { useEffect, useRef } from 'react'
import { getViewportForBounds, useReactFlow } from '@xyflow/react'
import { EV } from '@/core/events'
import type { DiagramDoc } from '@/core/model/types'
import {
  exportPngFile,
  exportSvgFile,
  type ExportBackground,
  type ExportColors,
  type FrameInfo,
} from '@/io/export'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { finishCanvasMotion } from './motion/canvasMotion'

const PAD = 72 // 内容四周留白（px）；需容纳越出节点包围盒的回环曲线

interface ExportDetail {
  scale?: number
  background?: ExportBackground
  titleblock?: { author: string; version: string } | null
}

function themeColors(): ExportColors {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string) => cs.getPropertyValue(name).trim()
  return {
    line: v('--line'),
    ink: v('--ink'),
    ink3: v('--ink-3'),
    panel: v('--surface'),
    canvas: v('--canvas'),
    dot: v('--dot'),
  }
}

function frameInfo(doc: DiagramDoc, tb: ExportDetail['titleblock']): FrameInfo | null {
  if (!tb) return null
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    title: doc.title,
    author: tb.author,
    version: tb.version,
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
  }
}

/** 挂一次：监听导出事件，用 RF 实例定位 .react-flow__viewport */
const nextFrames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (k: number) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)))
    step(n)
  })

export function useExportEvents(): void {
  const rf = useReactFlow()
  const rfRef = useRef(rf)
  rfRef.current = rf

  useEffect(() => {
    const run = async (kind: 'png' | 'svg', e: Event) => {
      const detail = (e as CustomEvent).detail as ExportDetail | undefined
      const doc = useDocumentStore.getState().doc
      const toast = useUiStore.getState().pushToast
      try {
        // 导出要的是最终画面：正在播的动效立即到终点，等一帧让 React Flow 画好再截
        if (finishCanvasMotion()) await nextFrames(2)
        const nodes = rfRef.current.getNodes().filter((n) => !(n.data as { ghost?: boolean }).ghost)
        const vpEl = document.querySelector<HTMLElement>('.react-flow__viewport')
        if (!vpEl || nodes.length === 0) {
          toast('error', zh.io.exportFailed)
          return
        }
        const bounds = rfRef.current.getNodesBounds(nodes)
        const width = Math.round(bounds.width + PAD * 2)
        const height = Math.round(bounds.height + PAD * 2)
        const vp = getViewportForBounds(
          bounds,
          width,
          height,
          0.1,
          4,
          PAD / Math.max(bounds.width, bounds.height),
        )
        const opts = {
          width,
          height,
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
          background: detail?.background ?? 'white',
          frame: frameInfo(doc, detail?.titleblock),
          colors: themeColors(),
          scale: detail?.scale ?? 2,
        }
        if (kind === 'png') {
          await exportPngFile(vpEl, doc, opts)
          toast('success', zh.io.exportedPng)
        } else {
          await exportSvgFile(vpEl, doc, opts)
          toast('success', zh.io.exportedSvg)
        }
      } catch (err) {
        toast('error', `${zh.io.exportFailed}：${err instanceof Error ? err.message : String(err)}`)
      }
    }
    const onPng = (e: Event) => void run('png', e)
    const onSvg = (e: Event) => void run('svg', e)
    window.addEventListener(EV.EXPORT_PNG, onPng)
    window.addEventListener(EV.EXPORT_SVG, onSvg)
    return () => {
      window.removeEventListener(EV.EXPORT_PNG, onPng)
      window.removeEventListener(EV.EXPORT_SVG, onSvg)
    }
  }, [])
}
