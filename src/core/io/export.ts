// 导出（SPEC §5）：JSON/Mermaid 纯文本；PNG/SVG 用 html-to-image 截图画布节点。
// 画布侧把 .react-flow__viewport 元素传进来；图框标题栏可选叠加（frameSvg）。
import { toPng, toSvg } from 'html-to-image'
import { docToJson } from './serialize'
import { docToMermaid } from './mermaid'
import { frameSvg } from './titleblock'
import type { DiagramDoc } from '../model/types'

function download(name: string, url: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

export function exportJsonFile(doc: DiagramDoc): void {
  const blob = new Blob([docToJson(doc)], { type: 'application/json;charset=utf-8' })
  download(`${doc.title}.json`, URL.createObjectURL(blob))
}

export function exportMermaidFile(doc: DiagramDoc): void {
  const blob = new Blob([docToMermaid(doc)], { type: 'text/plain;charset=utf-8' })
  download(`${doc.title}.mmd`, URL.createObjectURL(blob))
}

export interface FrameInfo {
  title: string
  author: string
  date: string
  version: string
}

export interface RasterOptions {
  /** 逻辑像素倍率，默认 2 */
  pixelRatio?: number
  /** 主题（决定节点配色解析） */
  theme: 'light' | 'dark'
  background?: string
}

/** 把画布 DOM 导出为 PNG；element 为 .react-flow__viewport 的父容器 */
export async function exportPngFile(
  element: HTMLElement,
  doc: DiagramDoc,
  opts: RasterOptions,
): Promise<void> {
  const url = await toPng(element, {
    pixelRatio: opts.pixelRatio ?? 2,
    backgroundColor: opts.background ?? (opts.theme === 'dark' ? '#0E1420' : '#FFFFFF'),
    filter: (node) => {
      const el = node as HTMLElement
      return !el.classList?.contains('ds-export-exclude')
    },
  })
  download(`${doc.title}.png`, url)
}

/** SVG 导出：html-to-image 生成主体；withFrame 时外层套图框标题栏 */
export async function exportSvgFile(
  element: HTMLElement,
  doc: DiagramDoc,
  opts: RasterOptions & { frame?: FrameInfo; colors?: { line: string; ink: string; ink3: string; panel: string } },
): Promise<void> {
  const inner = await toSvg(element, {
    backgroundColor: opts.background ?? (opts.theme === 'dark' ? '#0E1420' : '#FFFFFF'),
    filter: (node) => {
      const el = node as HTMLElement
      return !el.classList?.contains('ds-export-exclude')
    },
  })
  if (!opts.frame || !opts.colors) {
    download(`${doc.title}.svg`, inner)
    return
  }
  // 主体是 data:image/svg+xml;charset=utf-8,... 形式，解码后嵌进图框
  const decoded = decodeURIComponent(inner.split(',')[1] ?? '')
  const w = element.offsetWidth
  const h = element.offsetHeight
  const framed = frameSvg({
    width: w + 40,
    height: h + 40,
    margin: 40,
    info: opts.frame,
    colors: opts.colors,
    content: decoded,
  })
  const blob = new Blob([framed], { type: 'image/svg+xml;charset=utf-8' })
  download(`${doc.title}.svg`, URL.createObjectURL(blob))
}
