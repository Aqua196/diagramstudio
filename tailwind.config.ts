import type { Config } from 'tailwindcss'

// 颜色只允许引用 tokens.css 的 CSS 变量；组件内禁止硬编码色值
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"PingFang SC"',
          '"HarmonyOS Sans SC"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        ui: ['13px', '20px'],
      },
    },
  },
  plugins: [],
} satisfies Config
