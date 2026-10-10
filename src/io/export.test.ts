// composeExportSvg（A1）：三种背景与图框标题栏的合成结果。
import { describe, expect, it } from 'vitest'
import { composeExportSvg, type ExportColors } from './export'

const colors: ExportColors = {
  line: '#D9DEE4',
  ink: '#1B2430',
  ink3: '#5D6875',
  panel: '#FAFBFC',
  sheet: '#F1F4F6',
  gridFine: 'rgba(27,36,48,.06)',
  gridCoarse: 'rgba(27,36,48,.12)',
}
const content = '<svg><rect width="10" height="10"/></svg>'
const base = { width: 200, height: 100, colors }

describe('composeExportSvg', () => {
  it('白底：单个白色背景矩形', () => {
    const svg = composeExportSvg(content, { ...base, background: 'white' })
    expect(svg).toContain('fill="#FFFFFF"')
    expect(svg).not.toContain('ds-gf')
  })

  it('透明：无背景矩形', () => {
    const svg = composeExportSvg(content, { ...base, background: 'transparent' })
    expect(svg).not.toContain('<rect width="200"')
    expect(svg).not.toContain('ds-gf')
  })

  it('方格纸：sheet 底色 + 细 24 / 粗 120 两组 pattern', () => {
    const svg = composeExportSvg(content, { ...base, background: 'grid' })
    expect(svg).toContain('width="24"')
    expect(svg).toContain('width="120"')
    expect(svg).toContain('url(#ds-gf)')
    expect(svg).toContain('url(#ds-gc)')
    expect(svg).toContain(colors.gridFine)
    expect(svg).toContain(colors.gridCoarse)
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
