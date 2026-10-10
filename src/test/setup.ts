import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// 只冻结 Date（setTimeout 等仍为真实计时）：
// core/history.executeCommand 总是写入 draft.updatedAt = Date.now()，
// 「无实质改动的命令不入栈」依赖同一毫秒内的两次调用，真实时钟下为偶发失败。
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-01-01T00:00:00Z') })
