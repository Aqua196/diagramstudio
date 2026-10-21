// SPEC §8.8 协作 e2e（C3）：两个独立 browser context 进同一 ?room=，
// A 端新增节点在 B 端出现。ws 服务由 playwright webServer（collab:server 1234）提供。
import { expect, test } from '@playwright/test'
import { dropShape, freshHome, newBlank, watchConsole } from './helpers'

test('8 协作：两上下文同房同步新增节点', async ({ browser }) => {
  const ctxA = await browser.newContext({ reducedMotion: 'reduce' })
  const ctxB = await browser.newContext({ reducedMotion: 'reduce' })
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  const probA = watchConsole(a)
  const probB = watchConsole(b)

  try {
    // A：新建流程图 → 分享弹层「开启协作并生成链接」把 ?room= 写进地址栏
    await freshHome(a)
    await newBlank(a, 'flowchart')
    await a.getByRole('button', { name: '分享' }).click()
    await a.getByRole('button', { name: '开启协作并生成链接' }).click()
    await expect(a.getByRole('textbox', { name: '复制链接' })).toHaveValue(/room=/)
    await a.keyboard.press('Escape')
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
