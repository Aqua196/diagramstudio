// 实验 9 集成测试（四）：画布渲染 × 插件形状 × 导出管线。
// ER 实体的字段行由插件画在 <svg> 的 foreignObject 里；导出的成品不应带出编辑控件。
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { freshHome, openExample, settle, watchConsole } from './helpers'

test('I12 ER 图导出 SVG：字段行的编辑控件不进成品，输入框保持画布上的样式', async ({ page }) => {
  const problems = watchConsole(page)
  await freshHome(page)
  await openExample(page, 'er')
  await settle(page)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出', exact: true }).click()
  await page.getByRole('radio', { name: /SVG/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: '导出', exact: true }).click()
  const svg = readFileSync((await (await dl).path())!, 'utf8')

  const report = await page.evaluate((text) => {
    const d = new DOMParser().parseFromString(text, 'image/svg+xml')
    // 用浏览器自己解析内联样式（浏览器会把逐边属性合并成 border-style 等简写，不能按文本匹配）
    const probe = document.createElement('div')
    const style = (el: Element) => {
      probe.setAttribute('style', el.getAttribute('style') ?? '')
      return probe.style
    }
    const inputs = [...d.querySelectorAll('input.ds-er-input')]
    return {
      inputs: inputs.length,
      // 拖动柄、删除、添加字段：成品里应不可见
      visibleControls: [...d.querySelectorAll('.ds-er-grip, .ds-er-del, .ds-er-add')].filter(
        (el) => style(el).display !== 'none',
      ).length,
      // 输入框在画布上无边框、透明背景；成品里丢了样式就会变成浏览器默认的带边框输入框
      unstyledInputs: inputs.filter((el) => style(el).borderTopStyle !== 'none').length,
      bytes: text.length,
    }
  }, svg)
  expect(report.inputs).toBeGreaterThan(0)
  expect(report.visibleControls).toBe(0)
  expect(report.unstyledInputs).toBe(0)
  // 只内联决定外观的样式：修复前约 560 KB，若复制全部计算样式会膨胀到约 1.2 MB
  expect(report.bytes).toBeLessThan(800_000)
  expect(problems).toEqual([])
})

test('I13 插件能力声明 × 导出对话框：只有声明了 mermaid 的流程图可选 Mermaid 文本', async ({
  page,
}) => {
  const problems = watchConsole(page)
  const mermaidOption = async (type: 'flowchart' | 'mindmap' | 'er') => {
    await freshHome(page)
    await openExample(page, type)
    await page.getByRole('button', { name: '导出', exact: true }).click()
    const radio = page.getByRole('radio', { name: /Mermaid/ })
    const enabled = await radio.isEnabled()
    await page.keyboard.press('Escape')
    return enabled
  }
  expect(await mermaidOption('flowchart')).toBe(true)
  expect(await mermaidOption('mindmap')).toBe(false)
  expect(await mermaidOption('er')).toBe(false)
  expect(problems).toEqual([])
})
