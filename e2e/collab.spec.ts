// SPEC §8.8 协作 e2e（C3）：两个独立 browser context 进同一 ?room=，
// A 端新增节点在 B 端出现。ws 服务由 playwright webServer（collab:server 1234）提供。
import { expect, test, type Page } from '@playwright/test'

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))
  return problems
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

test('8 协作：两上下文同房同步新增节点', async ({ browser }) => {
  const room = `e2e-${Date.now()}`
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  const probA = watchConsole(a)
  const probB = watchConsole(b)

  try {
    // A：新建流程图并进入房间
    await a.goto('/')
    await a.evaluate(() => localStorage.clear())
    await a.locator('.ds-new-card').first().click()
    await expect(a.locator('.react-flow')).toBeVisible()
    await a.goto(`/?room=${room}&doc=new-flow`)
    // 若带 room 进入但无文档，直接开新文档再分享更稳：先确保编辑器
    if (!(await a.locator('.react-flow').isVisible())) {
      await a.locator('.ds-new-card').first().click()
      await a.goto(`/?room=${room}`)
    }
    await expect(a.locator('.react-flow')).toBeVisible()
    // 建房：点 分享 把 ?room= 写进地址栏（若尚未在房内）
    if (!a.url().includes('room=')) {
      await a.getByRole('button', { name: '更多' }).click()
      await a.getByRole('menuitem', { name: '分享' }).click()
      await a.waitForTimeout(500)
    }
    expect(a.url()).toContain('room=')

    // A 放一个节点
    const pane = a.locator('.react-flow__pane')
    const box = (await pane.boundingBox())!
    await dropShape(a, 'process', box.x + 300, box.y + 300)
    await expect(a.locator('.react-flow__node')).toHaveCount(1)

    // B：用同一链接打开（新 context → 空 localStorage，?room= 直接进协作）
    await b.goto(a.url())
    await expect(b.locator('.react-flow')).toBeVisible({ timeout: 15_000 })
    await expect(b.locator('.react-flow__node')).toHaveCount(1, { timeout: 15_000 })

    // B 再放一个 → A 应看到 2 个
    const paneB = b.locator('.react-flow__pane')
    const boxB = (await paneB.boundingBox())!
    await dropShape(b, 'decision', boxB.x + 500, boxB.y + 300)
    await expect(b.locator('.react-flow__node')).toHaveCount(2)
    await expect(a.locator('.react-flow__node')).toHaveCount(2, { timeout: 15_000 })

    expect(probA).toEqual([])
    expect(probB).toEqual([])
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
})
