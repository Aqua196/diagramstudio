// 图框与工程标题栏（产品特色，SPEC §5）：纯字符串生成 SVG，
// 导出 PNG/SVG 时作为最外层叠加，不参与文档模型。

export interface TitleBlockInfo {
  title: string
  author: string
  date: string
  version: string
}

export interface FrameColors {
  line: string
  ink: string
  ink3: string
  panel: string
}

export interface FrameOptions {
  width: number
  height: number
  /** 图形内容外扩边距（px） */
  margin: number
  info: TitleBlockInfo
  colors: FrameColors
  /** 可选：完整 <svg …> 字串，原样嵌入外框内侧（SVG 导出时放图形内容） */
  content?: string
}

export const TITLE_BLOCK_W = 200
export const TITLE_BLOCK_H = 96

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 返回覆盖整幅导出画面的 <svg>：外边框 + 右下角工程标题栏。
 * width/height 是最终导出像素尺寸（含 margin）。
 */
export function frameSvg({ width, height, margin, info, colors, content }: FrameOptions): string {
  const bx = margin / 2
  const by = margin / 2
  const bw = width - margin
  const bh = height - margin
  const tx = bx + bw - TITLE_BLOCK_W
  const ty = by + bh - TITLE_BLOCK_H
  const rowH = TITLE_BLOCK_H / 3
  const labelSize = 10
  const valueSize = 13

  const cell = (
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    span = 1,
  ) => `
    <rect x="${x}" y="${y}" width="${w * span}" height="${h}" fill="none" stroke="${colors.line}" stroke-width="0.8"/>
    <text x="${x + 6}" y="${y + 12}" font-size="${labelSize}" fill="${colors.ink3}" font-family="Barlow, 'PingFang SC', 'Microsoft YaHei', sans-serif">${esc(label)}</text>
    <text x="${x + 6}" y="${y + 27}" font-size="${valueSize}" font-weight="600" fill="${colors.ink}" font-family="'Barlow Semi Condensed', Barlow, 'PingFang SC', 'Microsoft YaHei', sans-serif">${esc(value)}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${content ? `<g transform="translate(${bx},${by})">${content}</g>` : ''}
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="${colors.ink}" stroke-width="1.2" pointer-events="none"/>
  <g>
    <rect x="${tx}" y="${ty}" width="${TITLE_BLOCK_W}" height="${TITLE_BLOCK_H}" fill="${colors.panel}" stroke="${colors.ink}" stroke-width="1"/>
    ${cell(tx, ty, TITLE_BLOCK_W, rowH, '图名', info.title)}
    ${cell(tx, ty + rowH, TITLE_BLOCK_W / 2, rowH, '作者', info.author)}
    ${cell(tx + TITLE_BLOCK_W / 2, ty + rowH, TITLE_BLOCK_W / 2, rowH, '日期', info.date)}
    ${cell(tx, ty + rowH * 2, TITLE_BLOCK_W / 2, rowH, '版本', info.version)}
    ${cell(tx + TITLE_BLOCK_W / 2, ty + rowH * 2, TITLE_BLOCK_W / 2, rowH, '比例', '1:1')}
  </g>
</svg>`
}
