// 实验 6 命令行工具的独立构建：以 SSR（Node.js）目标打包成一个 .mjs 文件，
// 依赖（dagre、zod 等）一并打进产物，复制到任何装有 Node.js 20+ 的机器都能运行。
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  build: {
    ssr: here('./mmd2json.ts'),
    outDir: here('./dist'),
    emptyOutDir: true,
    target: 'node20',
    rollupOptions: {
      output: { entryFileNames: 'mmd2json.mjs' },
      // 与主构建相同：只滤掉第三方包里位置不规范的 PURE 注释提示，其它警告照常输出
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) return
        warn(warning)
      },
    },
  },
  // 命令行工具不需要网页的静态资源（public/ 下的图标等）
  publicDir: false,
  ssr: { noExternal: true },
  logLevel: 'warn',
})
