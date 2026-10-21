// composeExportSvg（A1）：三种背景与图框标题栏的合成结果。
import { describe, expect, it } from 'vitest'
import { composeExportSvg, type ExportColors } from './export'

const colors: ExportColors = {
  line: '#E4E4DF',
  ink: '#1C1C1A',
  ink3: '#6B6B66',
  panel: '#FFFFFF',
  canvas: '#F6F6F3',
  dot: 'rgba(28,28,26,.17)',
}
const content = '<svg><rect width="10" height="10"/></svg>'
const base = { width: 200, height: 100, colors }

describe('composeExportSvg', () => {
  it('白底：单个白色背景矩形', () => {
    const svg = composeExportSvg(content, { ...base, background: 'white' })
    expect(svg).toContain('fill="#FFFFFF"')
    expect(svg).not.toContain('ds-dots')
  })

  it('透明：无背景矩形', () => {
    const svg = composeExportSvg(content, { ...base, background: 'transparent' })
    expect(svg).not.toContain('<rect width="200"')
    expect(svg).not.toContain('ds-dots')
  })

  it('点阵：canvas 底色 + 24px 圆点 pattern（与画布一致）', () => {
    const svg = composeExportSvg(content, { ...base, background: 'grid' })
    expect(svg).toContain(`fill="${colors.canvas}"`)
    expect(svg).toContain('width="24"')
    expect(svg).toContain('<circle')
    expect(svg).toContain('url(#ds-dots)')
    expect(svg).toContain(colors.dot)
  })

  it('带图框：外层 frameSvg 含标题栏与内容', () => {
    const svg = composeExportSvg(content, {
      ...base,
      background: 'white',
      frame: { title: '测试图', author: '张三', date: '2026-10-15', version: 'V1.0' },
    })
    for (const s of ['测试图', '张三', '2026-10-15', 'V1.0']) expect(svg).toContain(s)
    expect(svg).toContain(`width="${base.width + 40}"`)
  })

  it('无图框：输出尺寸与内容尺寸一致', () => {
    const svg = composeExportSvg(content, { ...base, background: 'white' })
    expect(svg).toContain('width="200"')
    expect(svg).toContain('height="100"')
  })
})
