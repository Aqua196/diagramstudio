// pnpm dev:collab：同时启动协作 ws 服务与 vite，任一退出则全部退出，SIGINT 透传。
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const procs = [
  spawn('node', [`${here}dev.mjs`], { stdio: 'inherit' }),
  spawn('pnpm', ['dev'], { stdio: 'inherit', shell: false }),
]

function shutdown(code = 0) {
  for (const p of procs) if (!p.killed) p.kill('SIGINT')
  process.exit(code)
}

for (const p of procs) {
  p.on('exit', (code) => shutdown(code ?? 0))
  p.on('error', () => shutdown(1))
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
