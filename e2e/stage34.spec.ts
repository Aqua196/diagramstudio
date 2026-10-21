// 编辑器骨架 e2e（UI 改版）：首页入口 → 画布优先布局（四角浮动条 + 形状坞）→ 拖入节点 →
// 上下文工具条联动 → 自动保存；两档视口截图（1440×900 / 1280×720），控制台零 error/warning。
import { expect, test } from '@playwright/test'
import { dropShape, freshHome, newBlank, paneCenter, vpTag, watchConsole } from './helpers'

test.beforeEach(async ({ page }) => {
  await freshHome(page)
})

test('首页：品牌 + 三类新建卡 + 空的最近列表', async ({ page }) => {
  const problems = watchConsole(page)
  await expect(page.locator('.ds-home-name')).toContainText('DiagramStudio')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('.ds-new-card')).toHaveCount(3)
  await expect(page.locator('.ds-recent-empty')).toBeVisible()
  await page.screenshot({ path: `docs/screenshots/stage34-home-${vpTag(page)}.png` })
  expect(problems).toEqual([])
})

test('新建流程图进入编辑器：四角浮动条 / 形状坞 / 空画布引导齐全', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  await expect(page.locator('.ds-corner-tl')).toBeVisible()
  await expect(page.locator('.ds-corner-tr')).toBeVisible()
  await expect(page.locator('.ds-dock')).toBeVisible()
  await expect(page.locator('.ds-corner-bl')).toBeVisible()
  await expect(page.locator('.ds-empty')).toBeVisible()
  await page.screenshot({ path: `docs/screenshots/stage34-editor-empty-${vpTag(page)}.png` })
  expect(problems).toEqual([])
})

test('拖入形状 → 节点上画布 → 上下文工具条出现 → 保存到 localStorage', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  const c = await paneCenter(page)
  await dropShape(page, 'process', c.x - 120, c.y - 40)
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 })
  // 拖入即选中：工具条出现，含颜色/删除
  const bar = page.getByRole('toolbar')
  await expect(bar).toBeVisible()
  await expect(bar.getByRole('button', { name: '颜色' })).toBeVisible()
  await expect(bar.getByRole('button', { name: '删除' })).toBeVisible()

  await dropShape(page, 'decision', c.x + 140, c.y + 60)
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  // 自动保存落盘（防抖 500ms）
  await page.waitForTimeout(700)
  const docs = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('ds.docs.v1') ?? '{}') as Record<
        string,
        { nodes: Record<string, unknown> }
      >,
  )
  expect(Object.keys(docs)).toHaveLength(1)
  expect(Object.keys(Object.values(docs)[0].nodes)).toHaveLength(2)
  await page.screenshot({ path: `docs/screenshots/stage34-editor-nodes-${vpTag(page)}.png` })
  expect(problems).toEqual([])
})

test('双击空白放节点（不再被双击缩放吞掉）', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  const c = await paneCenter(page)
  await page.mouse.dblclick(c.x + 200, c.y - 150)
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '缩放到 100%' })).toHaveText('100%')
  expect(problems).toEqual([])
})

test('快捷键面板列出全部快捷键', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('撤销')
  await expect(page.getByRole('dialog')).toContainText('思维导图：添加子主题')
  await page.keyboard.press('Escape')
  expect(problems).toEqual([])
})

test('深色主题：编辑器完整渲染', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  await page.evaluate(() => localStorage.setItem('ds:theme', 'dark'))
  await page.reload()
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('html.dark')).toHaveCount(1)
  const c = await paneCenter(page)
  await dropShape(page, 'process', c.x, c.y)
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.screenshot({ path: `docs/screenshots/stage34-editor-dark-${vpTag(page)}.png` })
  expect(problems).toEqual([])
})
