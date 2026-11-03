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
    const style = (el: Element) => el.getAttribute('style') ?? ''
    const inputs = [...d.querySelectorAll('input.ds-er-input')]
    return {
      inputs: inputs.length,
      // 拖动柄、删除、添加字段：成品里应不可见
      visibleControls: [...d.querySelectorAll('.ds-er-grip, .ds-er-del, .ds-er-add')].filter(
        (el) => !/display:\s*none/.test(style(el)),
      ).length,
      // 输入框在画布上无边框、透明背景；成品里丢了样式就会变成浏览器默认的带边框输入框
      unstyledInputs: inputs.filter((el) => !/border-top-style:\s*none/.test(style(el))).length,
    }
  }, svg)
  expect(report.inputs).toBeGreaterThan(0)
  expect(report.visibleControls).toBe(0)
  expect(report.unstyledInputs).toBe(0)
  expect(problems).toEqual([])
})
