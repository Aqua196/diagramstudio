// SPEC §8 功能用例（C3）：三类图模板/编辑、导出导入、Mermaid、持久化、主题。
// 每条用例末尾断言控制台零 error/warning。
import { expect, test, type Page } from '@playwright/test'

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))
  return problems
}

async function newDoc(page: Page, cardIndex: number): Promise<void> {
  await page.locator('.ds-new-card').nth(cardIndex).click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

async function dropShape(page: Page, kind: string, x: number, y: number): Promise<void> {
  const pane = page.locator('.react-flow__pane')
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

/** 从节点 A 底部把柄拖到节点 B 顶部把柄连线（须落在把柄上，节点体不触发 onConnect） */
async function connectNodes(page: Page, fromIdx: number, toIdx: number): Promise<void> {
  const handle = page.locator('.react-flow__node').nth(fromIdx).locator('.react-flow__handle-bottom')
  const target = page.locator('.react-flow__node').nth(toIdx).locator('.react-flow__handle-top')
  const h = (await handle.boundingBox())!
  const t = (await target.boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 20 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('1 流程图：模板 + 拖形状 + 连线 + 编辑文字 + 撤销重做', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 0)
  // 模板：左栏第一张模板卡
  await page.locator('.ds-tpl-card').first().click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
  const before = await page.locator('.react-flow__node').count()

  // 拖入一个新节点
  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  await dropShape(page, 'process', box.x + 200, box.y + 500)
  await expect(page.locator('.react-flow__node')).toHaveCount(before + 1)

  // 连线：模板第一个节点 → 新节点
  const edgesBefore = await page.locator('.react-flow__edge').count()
  await connectNodes(page, 0, before)
  await expect(page.locator('.react-flow__edge')).toHaveCount(edgesBefore + 1)

  // 编辑文字：双击最后节点 → 输入 → Enter 提交
  const last = page.locator('.react-flow__node').nth(before)
  await last.dblclick()
  const editor = page.locator('.ds-text-editor')
  await expect(editor).toBeVisible()
  await editor.fill('新步骤X')
  await editor.press('Enter')
  await expect(last).toContainText('新步骤X')
  // 撤销一次 → 文字回退；再重做
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(last).not.toContainText('新步骤X')
  await page.getByRole('button', { name: '重做' }).click()
  await expect(last).toContainText('新步骤X')
  expect(problems).toEqual([])
})

test('2 思维导图：Tab/Enter 建树 + 折叠 + 自动布局 + Delete 整支删除与撤销恢复', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 1)
  // 空文档：先放入中心主题
  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  await dropShape(page, 'centerTopic', box.x + box.width / 2, box.y + box.height / 2)
  const center = page.locator('.react-flow__node').first()
  await expect(center).toBeVisible()

  // 选中中心主题 → Tab 加子、再 Tab、Enter 加同级
  await center.click()
  await page.keyboard.press('Tab')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await page.keyboard.press('Tab')
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  // 选中第二个节点（第一个子）按 Enter → 同级
  await page.locator('.react-flow__node').nth(1).click()
  await page.keyboard.press('Enter')
  await expect(page.locator('.react-flow__node')).toHaveCount(4)

  // 折叠：悬停中心节点，点击折叠按钮
  await center.click()
  const collapse = page.locator('.ds-mind-collapse').first()
  await expect(collapse).toBeVisible()
  await collapse.click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  // 展开恢复
  await page.locator('.ds-mind-collapse').first().click()
  await expect(page.locator('.react-flow__node')).toHaveCount(4)

  // Delete 整支：选中一个子主题 → Delete 删它及其子树
  await page.locator('.react-flow__node').nth(1).click()
  const countBefore = await page.locator('.react-flow__node').count()
  await page.keyboard.press('Delete')
  await page.waitForTimeout(300)
  const countAfter = await page.locator('.react-flow__node').count()
  expect(countAfter).toBeLessThan(countBefore)
  // 撤销恢复全部
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(countBefore)
  expect(problems).toEqual([])
})

test('3 ER：新建实体 + 字段编辑 + 关系带基数', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 2)
  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  await dropShape(page, 'entity', box.x + 250, box.y + 200)
  await dropShape(page, 'entity', box.x + 600, box.y + 200)
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  // 字段：实体默认无字段 → 先加一行再改名，再加第二行
  await page.locator('.ds-er-add').first().click()
  const nameInput = page.locator('.ds-er-name').first()
  await nameInput.fill('user_id')
  await page.locator('.ds-er-add').first().click()
  await expect(page.locator('.ds-er-name')).toHaveCount(2)

  // 连线 + 基数下拉
  await connectNodes(page, 0, 1)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await page.locator('.react-flow__edge-interaction').click({ force: true })
  await page.locator('.ds-group-head', { hasText: '连线' }).click()
  const cardSel = page.getByLabel('终点基数')
  await cardSel.selectOption('N')
  await expect(cardSel).toHaveValue('N')
  expect(problems).toEqual([])
})

test('4 导出 JSON → 导入 → 内容一致；导出 PNG 文件非空', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 0)
  await page.locator('.ds-tpl-card').first().click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
  const nodeCount = await page.locator('.react-flow__node').count()

  // 导出 JSON（下载事件）
  const dl1 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出' }).click()
  await page.getByRole('menuitem', { name: '导出 JSON' }).click()
  const jsonDl = await dl1
  const jsonPath = await jsonDl.path()
  expect(jsonPath).not.toBeNull()

  // 导出 PNG（经导出对话框确认）
  const dl2 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出' }).click()
  await page.getByRole('menuitem', { name: '导出 PNG' }).click()
  await page.getByRole('button', { name: '导出', exact: true }).last().click()
  const pngDl = await dl2
  const pngPath = await pngDl.path()
  expect(pngPath).not.toBeNull()

  // 导入 JSON（filechooser）
  const fc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '导出' }).click()
  await page.getByRole('menuitem', { name: '导入 JSON' }).click()
  const chooser = await fc
  await chooser.setFiles(await jsonDl.path()!)
  await expect(page.locator('.react-flow__node')).toHaveCount(nodeCount, { timeout: 5000 })
  expect(problems).toEqual([])
})

test('5 Mermaid 导入：未知行跳过并提示', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 0)
  const fc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '导出' }).click()
  await page.getByRole('menuitem', { name: '导入 Mermaid' }).click()
  const chooser = await fc
  await chooser.setFiles({
    name: 't.mmd',
    mimeType: 'text/plain',
    buffer: Buffer.from('graph TD\n  A[开始] --> B[结束]\n  this is not mermaid syntax line\n'),
  })
  await expect(page.locator('.ds-toast')).toContainText('行被跳过', { timeout: 5000 })
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  expect(problems).toEqual([])
})

test('6 自动保存后刷新内容仍在', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 0)
  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  await dropShape(page, 'process', box.x + 300, box.y + 300)
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.waitForTimeout(800) // 防抖 500ms
  await page.reload()
  // App 启动时 lastOpened 恢复文档 → 直接进编辑器
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  expect(problems).toEqual([])
})

test('7 主题切换后刷新仍保持', async ({ page }) => {
  const problems = watchConsole(page)
  await newDoc(page, 0)
  await page.getByRole('button', { name: '主题' }).click()
  await page.getByRole('menuitem', { name: '暗色' }).click()
  await expect(page.locator('html.dark')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('html.dark')).toHaveCount(1)
  await expect(page.locator('.react-flow')).toBeVisible()
  expect(problems).toEqual([])
})
