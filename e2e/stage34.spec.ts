// 阶段3/4 e2e：首页入口 → 编辑器骨架 → 画布拖入节点 → 检查器联动，
// 两档视口截图（1440×900 / 1280×720），控制台零 error/warning。
import { expect, test, type Page } from '@playwright/test'

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))
  return problems
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('首页：三类入口卡 + 空文档列表', async ({ page }) => {
  const problems = watchConsole(page)
  await expect(page.locator('h1')).toContainText('DiagramStudio')
  await expect(page.locator('.ds-new-card')).toHaveCount(3)
  const vp = page.viewportSize()!
  const tag = vp.width === 1440 ? '1440' : '1280'
  await page.screenshot({ path: `docs/screenshots/stage34-home-${tag}.png` })
  expect(problems).toEqual([])
})

test('新建流程图进入编辑器：顶栏/面板/空画布提示齐全', async ({ page }) => {
  const problems = watchConsole(page)
  await page.locator('.ds-new-card').first().click()
  await expect(page.locator('.ds-topbar')).toBeVisible()
  await expect(page.locator('.ds-panel-left')).toBeVisible()
  await expect(page.locator('.ds-panel-right')).toBeVisible()
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('.ds-empty')).toBeVisible()
  const vp = page.viewportSize()!
  const tag = vp.width === 1440 ? '1440' : '1280'
  await page.screenshot({ path: `docs/screenshots/stage34-editor-empty-${tag}.png` })
  expect(problems).toEqual([])
})

test('拖入形状 → 节点上画布 → 检查器显示节点面板 → 保存到 localStorage', async ({ page }) => {
  const problems = watchConsole(page)
  await page.locator('.ds-new-card').first().click()
  await expect(page.locator('.react-flow')).toBeVisible()

  // HTML5 DnD：playwright 下用 DataTransfer 事件派发模拟（落点在画布中部）
  const shape = page.locator('.ds-shape').first()
  const pane = page.locator('.react-flow__pane')
  const dropAt = async (kind: string, x: number, y: number) => {
    const init = {
      clientX: x,
      clientY: y,
      dataTransfer: await page.evaluateHandle((k) => {
        const dt = new DataTransfer()
        dt.setData('application/x-diagram-shape', k)
        return dt
      }, kind),
    }
    await pane.dispatchEvent('dragover', init)
    await pane.dispatchEvent('drop', init)
  }
  const paneBox = (await pane.boundingBox())!
  const cx = paneBox.x + paneBox.width / 2
  const cy = paneBox.y + paneBox.height / 2
  await shape.dispatchEvent('dragstart', {
    dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
  })
  await dropAt('process', cx - 120, cy - 40)
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 })
  await page.locator('.ds-group-head', { hasText: '节点' }).click()
  await expect(page.locator('.ds-panel-right')).toContainText('填充')

  // 再放一个 → 两个节点都出现在画布上
  await dropAt('decision', cx + 140, cy + 60)
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  // 自动保存落盘（防抖 500ms）
  await page.waitForTimeout(700)
  const docs = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ds.docs.v1') ?? '{}') as Record<string, { nodes: Record<string, unknown> }>,
  )
  expect(Object.keys(docs)).toHaveLength(1)
  expect(Object.keys(Object.values(docs)[0].nodes)).toHaveLength(2)

  const vp = page.viewportSize()!
  const tag = vp.width === 1440 ? '1440' : '1280'
  await page.screenshot({ path: `docs/screenshots/stage34-editor-nodes-${tag}.png` })
  expect(problems).toEqual([])
})

test('快捷键帮助对话框列出全部快捷键', async ({ page }) => {
  const problems = watchConsole(page)
  await page.locator('.ds-new-card').first().click()
  await expect(page.locator('.react-flow')).toBeVisible()
  await page.keyboard.press('?')
  await expect(page.locator('.ds-dialog')).toBeVisible()
  await expect(page.locator('.ds-dialog')).toContainText('撤销')
  await page.keyboard.press('Escape')
  expect(problems).toEqual([])
})

test('暗色主题：编辑器完整渲染', async ({ page }) => {
  const problems = watchConsole(page)
  await page.locator('.ds-new-card').first().click()
  await expect(page.locator('.react-flow')).toBeVisible()
  await page.evaluate(() => localStorage.setItem('ds:theme', 'dark'))
  await page.reload()
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('html.dark')).toHaveCount(1)
  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  const init = {
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    dataTransfer: await page.evaluateHandle(() => {
      const dt = new DataTransfer()
      dt.setData('application/x-diagram-shape', 'process')
      return dt
    }),
  }
  await pane.dispatchEvent('dragover', init)
  await pane.dispatchEvent('drop', init)
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  const vp = page.viewportSize()!
  const tag = vp.width === 1440 ? '1440' : '1280'
  await page.screenshot({ path: `docs/screenshots/stage34-editor-dark-${tag}.png` })
  expect(problems).toEqual([])
})
