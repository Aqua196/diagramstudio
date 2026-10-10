import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-e2e',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      '*.config.{js,ts}',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 严格模式下任何 any/@ts-ignore 都是事故入口，@ts-expect-error 必须写清原因
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // core 是「可纯单测」的领域层，不得依赖 React/画布/存储实现细节
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/core 必须保持纯 TypeScript' },
            { name: 'react-dom', message: 'src/core 必须保持纯 TypeScript' },
            { name: 'zustand', message: '状态管理只允许出现在 src/store' },
            { name: '@xyflow/react', message: '画布细节只允许出现在 features/canvas' },
            { name: 'html-to-image', message: 'DOM 截图只允许出现在 features/io' },
          ],
          patterns: [
            { group: ['@xyflow/*'], message: '画布细节只允许出现在 features/canvas' },
            { group: ['*/store/*', '@/store/*'], message: 'core 不得反向依赖 store' },
          ],
        },
      ],
    },
  },
  {
    files: ['e2e/**/*.ts', 'server/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
)
