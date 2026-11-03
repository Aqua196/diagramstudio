# 编码规范

本项目用 TypeScript（strict）+ React 编写。规范参考 TypeScript 官方手册、Google TypeScript Style Guide 和 typescript-eslint 推荐规则，并结合项目的分层架构补充了约定。能用工具检查的都交给工具（ESLint、Prettier、tsc），提交前与 CI 中自动执行。

## 1. 命名

| 对象                       | 规则                                       | 例子                                                      |
| -------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| 变量、函数、方法           | lowerCamelCase；函数以动词开头             | `createDoc`、`parseMermaid`、`executeCommand`             |
| 类型、接口、类、React 组件 | UpperCamelCase；接口不加 `I` 前缀          | `DiagramDoc`、`CollabAdapter`、`YjsCollabAdapter`         |
| 模块级常量                 | UPPER_SNAKE_CASE，名字里带单位             | `HISTORY_LIMIT`、`COALESCE_WINDOW_MS`、`SAVE_DEBOUNCE_MS` |
| 布尔值                     | `is` / `has` / `can` 前缀或形容词          | `canUndo`、`editing`、`autoLayoutOnChange`                |
| React 钩子                 | `use` 前缀                                 | `useDocEvents`、`useCanvasKeys`                           |
| 文件                       | 组件 `PascalCase.tsx`，其余 `camelCase.ts` | `ShapeDock.tsx`、`history.ts`                             |
| 测试文件                   | 与被测文件同名加 `.test`                   | `history.test.ts`                                         |
| 跨模块事件                 | `ds:领域:动作`，常量集中在 `EV`            | `EV.REVEAL_DOC = 'ds:doc:reveal'`                         |
| 未使用的参数               | 以 `_` 开头                                | `(_events, txn) => …`                                     |

## 2. 注释

- 每个文件开头用 1–3 行注释说明**这个文件负责什么**，必要时注明对应的 SPEC 章节。
- 导出的函数、接口、接口字段用 `/** … */` 说明意图、取值范围和边界情况，例如 `/** 相同 key 且间隔 <600ms 的连续命令合并为一条历史 */`。
- 注释写“为什么这样做”，不复述代码“做了什么”；统一用中文。
- 不提交注释掉的代码。`@ts-expect-error` 必须写明原因，禁止 `@ts-ignore`。

## 3. 格式

由 Prettier 统一（`.prettierrc`）：不写分号、单引号、每行最多 100 字符、多行结构保留尾逗号、LF 换行、2 空格缩进。`pnpm format` 一键格式化，任何人提交的代码格式都相同，代码审查只看内容。

## 4. 结构与规模

- 一个文件一个职责；组件文件不超过 200 行。
- 函数不超过 50 行，圈复杂度不超过 10，嵌套不超过 4 层，参数不超过 4 个（多了就传一个选项对象）。`pnpm lab6:quality` 对 Mermaid 导入导出模块按这些阈值检查。
- 条件分支较多时，优先改成“规则表”或拆出小函数，例如 `connectorOf()` 用一张优先级表代替一串 `if / else if`。

## 5. 类型

- `strict` 模式；禁止 `any`（`@typescript-eslint/no-explicit-any` 为 error）。
- 外部输入（导入的文件、本地存储、协作消息）先当作 `unknown`，经 `validateDoc` 校验后才能当作 `DiagramDoc` 使用。

## 6. 分层边界

- `src/core` 是纯 TypeScript 的领域层，不得引用 `react`、`zustand`、`@xyflow/*`、`html-to-image` 和 `src/store`（ESLint `no-restricted-imports` 强制）。因此 core 可以脱离浏览器做单元测试，也可以单独打包成命令行工具（见 `labs/lab6-module`）。
- 文档的一切修改都经过 `documentStore.execute(command)`，保证可撤销。
- 组件用选择器订阅 store，不取整个 store。
- 界面文案集中在 `src/i18n/zh.ts`，组件里不写死中文。
- 画布、工具条、外壳不按图类型写分支，差异由插件声明（如 `plugin.mermaid`）。

## 7. 提交信息

格式为 `类型(范围): 说明`，说明用中文写清“改了什么、为什么”。类型取 `feat`（新功能）、`fix`（缺陷修复）、`refactor`（重构，不改行为）、`test`、`docs`、`style`（只改格式）、`perf`、`ci`、`chore`。修复 GitHub Issue 时在正文写 `Fixes #编号`。

## 8. 提交前检查

```bash
pnpm lint && pnpm typecheck && pnpm test   # 与 CI 相同的质量门
pnpm lab6:quality                          # 圈复杂度 / 函数长度 / 嵌套 / 参数个数
```
