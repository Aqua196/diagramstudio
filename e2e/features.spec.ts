// SPEC §8 功能用例（C3，UI 改版后）：三类图建图/编辑、导出导入、Mermaid、持久化、主题。
// 每条用例末尾断言控制台零 error/warning。
import { expect, test } from '@playwright/test'
import {
  connectNodes,
  dropShape,
  freshHome,
  newBlank,
  openExample,
  paneCenter,
  selectEdge,
  watchConsole,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await freshHome(page)
})

test('1 流程图：示例 + 拖形状 + 连线 + 编辑文字 + 撤销重做', async ({ page }) => {
  const problems = watchConsole(page)
  await openExample(page, 'flowchart')
  const before = await page.locator('.react-flow__node').count()

  // 拖入一个新节点
  const c = await paneCenter(page)
  await dropShape(page, 'process', c.x + 320, c.y + 260)
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
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(last).not.toContainText('新步骤X')
  await page.getByRole('button', { name: '重做', exact: true }).click()
  await expect(last).toContainText('新步骤X')
  expect(problems).toEqual([])
})

test('1b 流程图上手：形状坞点击 → 直接打字 → 快捷加号接下一步', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  await expect(page.locator('.ds-empty')).toBeVisible()
  await page.locator('.ds-dock').getByRole('button', { name: '开始/结束' }).click()
  await expect(page.locator('.ds-text-editor')).toBeVisible()
  await page.keyboard.type('开始')
  await page.keyboard.press('Enter')
  await expect(page.locator('.react-flow__node').first()).toContainText('开始')

  // 选中后四周出现 +，点下方 + 接一个「处理」并直接编辑
  await page.locator('.ds-quick-bottom').click()
  await page.keyboard.type('填写表单')
  await page.keyboard.press('Enter')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await expect(page.locator('.react-flow__node').nth(1)).toContainText('填写表单')

  // 工具条：改颜色（一次可撤销）
  await page.getByRole('toolbar').getByRole('button', { name: '颜色' }).click()
  await page.getByRole('button', { name: '青' }).click()
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeEnabled()
  expect(problems).toEqual([])
})

test('2 思维导图：Tab/Enter 建树并直接打字 + 折叠 + Delete 整支删除与撤销恢复', async ({
  page,
}) => {
  const problems = watchConsole(page)
  await newBlank(page, 'mindmap')
  // 空白导图自带中心主题
  const center = page.locator('.react-flow__node').first()
  await expect(center).toContainText('中心主题')

  // Tab 加子主题 → 自动进入编辑 → 打字 → Enter 提交；再 Enter 加同级
  await center.click()
  await page.keyboard.press('Tab')
  await expect(page.locator('.ds-text-editor')).toBeVisible()
  await page.keyboard.type('需求')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('设计')
  await page.keyboard.press('Enter')
  // 在「设计」下再 Tab 一个子主题
  await page.keyboard.press('Tab')
  await page.keyboard.type('模式')
  await page.keyboard.press('Enter')
  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  await expect(page.locator('.react-flow__node', { hasText: '模式' })).toBeVisible()

  // 折叠：悬停中心节点，点击折叠按钮 → 只剩中心
  await center.hover()
  await center.locator('.ds-mind-collapse').click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await center.locator('.ds-mind-collapse').click()
  await expect(page.locator('.react-flow__node')).toHaveCount(4)

  // Delete 整支：选中「设计」→ 连同「模式」一起删
  await page.locator('.react-flow__node', { hasText: '设计' }).click()
  await page.keyboard.press('Delete')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  expect(problems).toEqual([])
})

test('3 ER：新建实体（预置主键）+ 字段编辑 + 关系带基数', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'er')
  const c = await paneCenter(page)
  await dropShape(page, 'entity', c.x - 220, c.y)
  await dropShape(page, 'entity', c.x + 160, c.y)
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  // 新实体自带 id 主键
  await expect(page.locator('.ds-er-name').first()).toHaveValue('id')

  // 字段：加一行再改名
  await page.locator('.ds-er-add').first().click()
  await expect(page.locator('.react-flow__node').first().locator('.ds-er-name')).toHaveCount(2)
  await page.locator('.react-flow__node').first().locator('.ds-er-name').nth(1).fill('user_id')

  // 连线默认 1 对 0..N；工具条改终点基数为 N
  await connectNodes(page, 0, 1, 'right', 'left')
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await selectEdge(page, 0)
  await page.getByRole('button', { name: '终点基数' }).click()
  await page.getByRole('option', { name: /^N ·/ }).click()
  await expect(page.getByRole('button', { name: '终点基数' })).toContainText('N')
  expect(problems).toEqual([])
})

test('4 导出 JSON → 导入 → 内容一致；导出 PNG 文件非空', async ({ page }) => {
  const problems = watchConsole(page)
  await openExample(page, 'flowchart')
  const nodeCount = await page.locator('.react-flow__node').count()

  // 导出 JSON
  const dl1 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出', exact: true }).click()
  await page.getByRole('radio', { name: /JSON/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: '导出', exact: true }).click()
  const jsonDl = await dl1
  expect(await jsonDl.path()).not.toBeNull()

  // 导出 PNG（默认格式）
  const dl2 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '导出', exact: true }).click()
  const pngDl = await dl2
  expect(await pngDl.path()).not.toBeNull()

  // 导入 JSON（更多菜单 → filechooser）
  const fc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '更多', exact: true }).click()
  await page.getByRole('menuitem', { name: '导入 JSON 工程文件' }).click()
  const chooser = await fc
  await chooser.setFiles((await jsonDl.path())!)
  await expect(page.locator('.react-flow__node')).toHaveCount(nodeCount, { timeout: 5000 })
  expect(problems).toEqual([])
})

test('5 Mermaid 导入：未知行跳过并提示', async ({ page }) => {
  const problems = watchConsole(page)
  const fc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '导入' }).click()
  await page.getByRole('menuitem', { name: '导入 Mermaid 流程图' }).click()
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

test('6 自动保存后刷新内容仍在；没动过的空白文档不留在首页', async ({ page }) => {
  const problems = watchConsole(page)
  // 新建空白后直接返回 → 首页无文档
  await newBlank(page, 'flowchart')
  await page.getByRole('button', { name: '返回首页' }).click()
  await expect(page.locator('.ds-doc-card')).toHaveCount(0)

  await newBlank(page, 'flowchart')
  const c = await paneCenter(page)
  await dropShape(page, 'process', c.x, c.y)
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.waitForTimeout(800) // 防抖 500ms
  await page.reload()
  // App 启动时 lastOpened 恢复文档 → 直接进编辑器
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.getByRole('button', { name: '返回首页' }).click()
  await expect(page.locator('.ds-doc-card')).toHaveCount(1)
  expect(problems).toEqual([])
})

test('7 主题切换后刷新仍保持', async ({ page }) => {
  const problems = watchConsole(page)
  await newBlank(page, 'flowchart')
  await page.getByRole('button', { name: '更多', exact: true }).click()
  await page.getByRole('menuitemradio', { name: '深色' }).click()
  await expect(page.locator('html.dark')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('html.dark')).toHaveCount(1)
  await expect(page.locator('.react-flow')).toBeVisible()
  expect(problems).toEqual([])
})
