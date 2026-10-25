// 导出（A1）：PNG/SVG 共用一份最终 SVG —
// composeExportSvg 统一拼背景（白/透明/方格纸）与图框标题栏，
// PNG 只是把它栅格化，保证两种格式边框/背景表现一致。
// 所有格式（含 JSON/Mermaid）都经 downloadBlob 落盘、经 fileName 命名。
import { frameSvg, TITLE_BLOCK_H, type FrameColors } from '@/core/io/titleblock'
import type { DiagramDoc } from '@/core/model/types'
import { zh } from '@/i18n/zh'

/** 下载文件名：标题为空时用默认名，免得得到一个叫「.png」的隐藏文件 */
export function fileName(doc: DiagramDoc, ext: string): string {
  return `${doc.title.trim() || zh.io.fileDiagram}.${ext}`
}

/** 触发浏览器下载。blob 地址稍后再回收：立刻回收时 Firefox 可能取消下载，不回收则每次导出都泄漏一份 */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** grid = 与画布一致的点阵底 */
export type ExportBackground = 'white' | 'transparent' | 'grid'

export interface FrameInfo {
  title: string
  author: string
  date: string
  version: string
}

/** 主题 token 计算值（导出时由调用方从 getComputedStyle 读入） */
export interface ExportColors extends FrameColors {
  canvas: string
  dot: string
}

export interface ComposeOptions {
  width: number
  height: number
  background: ExportBackground
  frame?: FrameInfo | null
  colors: ExportColors
}

const DOT_GAP = 24
const EXCLUDE = ['ds-export-exclude', 'react-flow__handle', 'react-flow__resize-control']
const FRAME_MARGIN = 40
const FRAME_GAP = 12

function backgroundSvg(o: ComposeOptions): string {
  if (o.background === 'transparent') return ''
  if (o.background === 'white') {
    return `<rect width="${o.width}" height="${o.height}" fill="#FFFFFF"/>`
  }
  // 点阵：canvas 底色 + 24px 间距圆点（与画布 Background 一致）
  return `<rect width="${o.width}" height="${o.height}" fill="${o.colors.canvas}"/>
  <defs>
    <pattern id="ds-dots" width="${DOT_GAP}" height="${DOT_GAP}" patternUnits="userSpaceOnUse">
      <circle cx="${DOT_GAP / 2}" cy="${DOT_GAP / 2}" r="0.8" fill="${o.colors.dot}"/>
    </pattern>
  </defs>
  <rect width="${o.width}" height="${o.height}" fill="url(#ds-dots)"/>`
}

/** 统一生成最终导出 SVG：背景层 + 画布内容（可选图框标题栏） */
export function composeExportSvg(contentSvg: string, o: ComposeOptions): string {
  const inner = `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}" viewBox="0 0 ${o.width} ${o.height}">
  ${backgroundSvg(o)}
  ${contentSvg}
</svg>`
  if (!o.frame) return inner
  // 底部额外预留标题栏高度 + 间隙，内容不会压到标题栏（R2）
  return frameSvg({
    width: o.width + FRAME_MARGIN,
    height: o.height + FRAME_MARGIN + TITLE_BLOCK_H + FRAME_GAP,
    margin: FRAME_MARGIN,
    info: o.frame,
    colors: o.colors,
    content: inner,
  })
}

export interface CaptureOptions {
  /** 内容区域像素尺寸（含 padding） */
  width: number
  height: number
  /** 应用到 .react-flow__viewport 的 transform（覆盖全部节点） */
  transform: string
  background: ExportBackground
  frame?: FrameInfo | null
  colors: ExportColors
  /** PNG 倍率 1x/2x/3x */
  scale?: number
}

/** 抓取 .react-flow__viewport 为主体 SVG 字串（排除 ds-export-exclude 元素） */
async function captureContentSvg(
  element: HTMLElement,
  o: CaptureOptions,
): Promise<{ svg: string; width: number; height: number }> {
  // 截图库只在导出时才用到，按需加载，不进首屏
  const { toSvg } = await import('html-to-image')
  const dataUrl = await toSvg(element, {
    width: o.width,
    height: o.height,
    backgroundColor: undefined,
    style: {
      width: `${o.width}px`,
      height: `${o.height}px`,
      transform: o.transform,
    },
    // 交互件不进成品：显式标记的、连接点、缩放夹点
    filter: (node) => {
      const cl = (node as HTMLElement).classList
      return !cl || !EXCLUDE.some((c) => cl.contains(c))
    },
  })
  // toSvg 返回 data:image/svg+xml;charset=utf-8,<encoded>
  return { svg: decodeURIComponent(dataUrl.split(',')[1] ?? ''), width: o.width, height: o.height }
}

/** 最终 SVG → PNG 下载（栅格化用 Image+canvas，scale 倍率） */
async function rasterize(
  svgText: string,
  width: number,
  height: number,
  scale: number,
): Promise<Blob> {
  // data URL（非 blob）：SVG 内含 foreignObject 时 blob 源会污染 canvas
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG 栅格化失败'))
    const bytes = new TextEncoder().encode(svgText)
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000)
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    img.src = 'data:image/svg+xml;base64,' + btoa(bin)
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布上下文')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('PNG 编码失败'))
    }, 'image/png')
  })
}

/** PNG 导出：与 SVG 同一份合成结果，按 scale 栅格化 */
export async function exportPngFile(
  element: HTMLElement,
  doc: DiagramDoc,
  o: CaptureOptions,
): Promise<void> {
  const c = await captureContentSvg(element, o)
  const finalSvg = composeExportSvg(c.svg, { ...o, frame: o.frame ?? null })
  const w = o.frame ? o.width + FRAME_MARGIN : o.width
  const h = o.frame ? o.height + FRAME_MARGIN + TITLE_BLOCK_H + FRAME_GAP : o.height
  downloadBlob(fileName(doc, 'png'), await rasterize(finalSvg, w, h, o.scale ?? 2))
}

/** SVG 导出：与 PNG 同一份合成结果，直接落盘文本 */
export async function exportSvgFile(
  element: HTMLElement,
  doc: DiagramDoc,
  o: CaptureOptions,
): Promise<void> {
  const c = await captureContentSvg(element, o)
  const finalSvg = composeExportSvg(c.svg, { ...o, frame: o.frame ?? null })
  downloadBlob(fileName(doc, 'svg'), new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' }))
}
