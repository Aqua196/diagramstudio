import type { Config } from 'tailwindcss'

// 颜色只允许引用 tokens.css 的 CSS 变量；组件内禁止硬编码色值
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sheet: 'var(--sheet)',
        panel: 'var(--panel)',
        'panel-sunken': 'var(--panel-sunken)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        accent: 'var(--accent)',
        'accent-wash': 'var(--accent-wash)',
        danger: 'var(--danger)',
        'grid-fine': 'var(--grid-fine)',
        'grid-coarse': 'var(--grid-coarse)',
      },
      fontFamily: {
        sans: ['Barlow', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'sans-serif'],
        num: ['"Barlow Semi Condensed"', 'Barlow', 'sans-serif'],
      },
      borderRadius: {
        control: '4px',
        pop: '8px',
      },
      boxShadow: {
        pop: 'var(--shadow-pop)',
      },
      fontSize: {
        ui: ['13px', '20px'],
        'panel-title': ['12px', '18px'],
        node: ['14px', '20px'],
      },
      transitionDuration: {
        node: '120ms',
        layout: '300ms',
      },
    },
  },
  plugins: [],
} satisfies Config
