// 导出（A1）：JSON/Mermaid 纯文本；PNG/SVG 共用一份最终 SVG —
// composeExportSvg 统一拼背景（白/透明/方格纸）与图框标题栏，
// PNG 只是把它栅格化，保证两种格式边框/背景表现一致。
import { toSvg } from 'html-to-image'
import { docToJson } from '@/core/io/serialize'
import { docToMermaid } from '@/core/io/mermaid'
import { frameSvg, TITLE_BLOCK_H, type FrameColors } from '@/core/io/titleblock'
import type { DiagramDoc } from '@/core/model/types'

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

export type ExportBackground = 'white' | 'transparent' | 'grid'

export interface FrameInfo {
  title: string
  author: string
  date: string
  version: string
}

/** 主题 token 计算值（导出时由调用方从 getComputedStyle 读入） */
export interface ExportColors extends FrameColors {
  sheet: string
  gridFine: string
  gridCoarse: string
}

export interface ComposeOptions {
  width: number
  height: number
  background: ExportBackground
  frame?: FrameInfo | null
  colors: ExportColors
}

const GRID_FINE = 24
const GRID_COARSE = 120
const FRAME_MARGIN = 40
const FRAME_GAP = 12

function backgroundSvg(o: ComposeOptions): string {
  if (o.background === 'transparent') return ''
  if (o.background === 'white') {
    return `<rect width="${o.width}" height="${o.height}" fill="#FFFFFF"/>`
  }
  // 方格纸：sheet 底色 + 细 24 / 粗 120 两组线（与画布 Background 一致）
  return `<rect width="${o.width}" height="${o.height}" fill="${o.colors.sheet}"/>
  <defs>
    <pattern id="ds-gf" width="${GRID_FINE}" height="${GRID_FINE}" patternUnits="userSpaceOnUse">
      <path d="M ${GRID_FINE} 0 L 0 0 0 ${GRID_FINE}" fill="none" stroke="${o.colors.gridFine}" stroke-width="1"/>
    </pattern>
    <pattern id="ds-gc" width="${GRID_COARSE}" height="${GRID_COARSE}" patternUnits="userSpaceOnUse">
      <path d="M ${GRID_COARSE} 0 L 0 0 0 ${GRID_COARSE}" fill="none" stroke="${o.colors.gridCoarse}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${o.width}" height="${o.height}" fill="url(#ds-gf)"/>
  <rect width="${o.width}" height="${o.height}" fill="url(#ds-gc)"/>`
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
  const dataUrl = await toSvg(element, {
    width: o.width,
    height: o.height,
    backgroundColor: undefined,
    style: {
      width: `${o.width}px`,
      height: `${o.height}px`,
      transform: o.transform,
    },
    filter: (node) => {
      const el = node as HTMLElement
      return !el.classList?.contains('ds-export-exclude')
    },
  })
  // toSvg 返回 data:image/svg+xml;charset=utf-8,<encoded>
  return { svg: decodeURIComponent(dataUrl.split(',')[1] ?? ''), width: o.width, height: o.height }
}

/** 最终 SVG → PNG 下载（栅格化用 Image+canvas，scale 倍率） */
async function rasterize(svgText: string, width: number, height: number, scale: number): Promise<string> {
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
  return await new Promise<string>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(URL.createObjectURL(b))
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
  const url = await rasterize(finalSvg, w, h, o.scale ?? 2)
  download(`${doc.title}.png`, url)
}

/** SVG 导出：与 PNG 同一份合成结果，直接落盘文本 */
export async function exportSvgFile(
  element: HTMLElement,
  doc: DiagramDoc,
  o: CaptureOptions,
): Promise<void> {
  const c = await captureContentSvg(element, o)
  const finalSvg = composeExportSvg(c.svg, { ...o, frame: o.frame ?? null })
  const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' })
  download(`${doc.title}.svg`, URL.createObjectURL(blob))
}
