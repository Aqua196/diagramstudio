# DiagramStudio 测试报告

> 本文档对应课程交付物清单第 4 项。所有数字为对当前 `main` 的实测结果，**数字随版本演进**（下文标注测量时间与命令）。

## 目录

- [1. 测试计划与策略](#1-测试计划与策略)
- [2. 单元测试清单（Vitest）](#2-单元测试清单vitest)
- [3. 端到端测试（Playwright）](#3-端到端测试playwright)
- [4. 覆盖率](#4-覆盖率)
- [5. 质量门实测结果](#5-质量门实测结果)
- [6. 性能测试方法](#6-性能测试方法)
- [7. 已知缺陷与限制](#7-已知缺陷与限制)

## 1. 测试计划与策略

| 层 | 工具 | 覆盖对象 | 依据 |
| --- | --- | --- | --- |
| 单元测试 | Vitest + jsdom | `src/core` 全部纯函数：命令/历史、布局、zod 校验、Mermaid、协作 diff、配色对比度、i18n 骨架 | SPEC §8 |
| 组件测试 | @testing-library/react | 检查器、色板、数字输入（规划中） | SPEC §8 |
| 端到端 | Playwright + @axe-core/playwright | SPEC §8 的 8 个场景；两档视口 1440×900 / 1280×720 | `playwright.config.ts` |
| 质量门 | eslint / tsc -b / vitest --coverage / vite build | lint 零警告、core 行/语句/函数/分支覆盖 ≥80% | `vitest.config.ts` 阈值 |

设计原则：`src/core` 禁引 React/zustand/@xyflow（ESLint 强制），因此领域逻辑全部可在毫秒级单测中验证；UI 正确性交给 e2e 与视觉截图。

## 2. 单元测试清单（Vitest）

实测：**7 个测试文件，32 个用例**（`pnpm test`，jsdom）。逐条列出（括号内为 `it` 标题原文）：

### src/core/commands/history.test.ts（5）

| 用例 | 断言要点 |
| --- | --- |
| execute 入栈并可撤销/重做 | 移动→undo 回原位、undoLabel/redoLabel 正确、redo 恢复 |
| 相同 coalesceKey 且 <600ms 合并为一条 | 连续打字合并、超窗新条目、分步撤销回文本 |
| 历史上限 200 条，超出丢弃最旧 | 210 次执行后 past.length === 200 |
| 无实质改动的命令不入栈 | 移动不存在节点不产生历史、doc 引用不变 |
| 空栈 undo/redo 是安全的 | 空栈调用不改 doc、不抛错 |

### src/core/commands/ops.test.ts（6）

| 用例 | 断言要点 |
| --- | --- |
| 删除节点连带删除依附连线 | 节点删掉后 source/target 指向它的连线一并消失 |
| 粘贴克隆保留内部连线、换新 id、偏移 | `cloneForPaste`：内部连线重映射新 id、位置偏移 |
| 叠放顺序：置顶/置底 | `bringToFront/sendToBack` 调整 zOrder |
| 左对齐取最小 x | `alignPositions` 纯函数 |
| 水平居中到包围盒中轴 | 同上 |
| 横向等距分布首尾不动 | `distributePositions` 只动中间节点、间隔相等 |

### src/core/commands/ops2.test.ts（6）

| 用例 | 断言要点 |
| --- | --- |
| resizeNode 约束最小尺寸并撤销 | resize 生效且可 undo（最小尺寸属交互层，命令不约束——见 DECISIONS） |
| patchNode/patchNodeStyle/patchEdge 修改并保留其他字段 | 局部补丁不误改字段 |
| reconnectEdge 换端点并记录原端点 | 重连改 source/target/handle |
| alignNodes 生成可撤销的移动命令；distributeNodes 竖向分布 | 命令级对齐/分布可 undo |
| setDocTitle / setSettings | 标题合并（coalesceKey）、设置补丁 |
| alignPositions 其余方向 | right/top/middle/bottom |

### src/core/io/mermaid.test.ts（4）

| 用例 | 断言要点 |
| --- | --- |
| 解析节点形状、连线、标签与链式 | `A[矩形]`/`A{判断}`/`-->|文字|`/链式 |
| 支持 LR 方向、虚线、链式 A-->B-->C、无箭头与粗线 | direction、`-.->`、`---`、`==>` |
| 支持 `-- 文字 -->` 标签形式与数据库/平行四边形 | `normalizeInlineLabel`、`[(…)]`、`[/…/]` |
| 导出可被自身解析器读回（节点/连线/标签一致） | 往返自洽 |

### src/core/collab/diff.test.ts（3）

| 用例 | 断言要点 |
| --- | --- |
| 首次写入：全部 set，meta 变更 | prev=null 时全量 setNodes/setEdges、metaChanged=true |
| 只改动的 key 进入 set，消失的进入 del | 引用比较粒度到 key |
| 标题/zOrder/settings 变化算 metaChanged | meta 三类变更各自触发 |

### src/core/core.test.ts（7）

| 用例 | 断言要点 |
| --- | --- |
| 配色对比度（7 对节点底色×明暗） | 全部 ≥4.5:1（WCAG，`palette.contrastRatio`） |
| 合法文档往返一致 | `docToJson → jsonToDoc` 无失真 |
| 非法 JSON 与坏结构给出中文原因 | 语法错误/字段类型错误的中文描述 |
| 引用完整性：悬空连线报错 | `semanticCheck` 检出 source/target 不存在 |
| dagre 为所有节点给出坐标且互不重叠（粗检） | 每个节点有坐标、无两节点完全重叠 |
| 思维导图左右交替布局且折叠子树隐藏 | 直接子节点奇偶分侧、`collapsedDescendants` |
| 图框与标题栏 | frameSvg 含标题/作者/日期/版本与外框 |

### src/i18n/zh.test.ts（1）

| 用例 | 断言要点 |
| --- | --- |
| 包含产品名与全部命名空间 | `zh` 的 app/common/plugins/… 命名空间齐全 |

## 3. 端到端测试（Playwright）

配置：`e2e/`、`playwright.config.ts`（项目 `desktop-1440` 1440×900 与 `desktop-1280` 1280×720 双视口；`webServer` 自动拉起 `pnpm dev`）。

已实现用例：

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| `e2e/smoke.spec.ts` | 首页渲染且控制台干净 | `<h1>` 含 DiagramStudio；console 零 error/warning；截图 `docs/screenshots/stage1-home.png` |

SPEC §8 要求的完整场景清单（随画布/外壳阶段落地，逐条对应）：

| # | 场景 | 关键断言 |
| --- | --- | --- |
| 1 | 模板新建流程图→拖入形状→连线→改文字→撤销重做 | 节点出现、连线出现、文本更新、undo 回退 |
| 2 | 思维导图 Tab/Enter 建树→折叠→自动布局 | 子/同级节点生成、子树隐藏、坐标非重叠 |
| 3 | ER 图新增实体、字段与关系 | 字段行出现、PK/FK 标记、基数可见 |
| 4 | 导出 JSON→再导入一致；导出 PNG 非空 | 往返文档等价；PNG 字节数 >0 |
| 5 | 导入 Mermaid | 节点/连线数量与 skipped 提示 |
| 6 | 自动保存后刷新仍在 | reload 后文档内容一致 |
| 7 | 切换主题并记住 | html.dark class、localStorage `ds:theme` |
| 8 | 两窗口协作同步 | 一端改动在另一端出现（需 `dev:collab`） |

全部 e2e 均断言 console 零 error/warning；首页与编辑器用 `@axe-core/playwright` 检查，不得有 serious/critical 级问题。

## 4. 覆盖率

`vitest run --coverage`（v8 provider，`include: ['src/core/**/*.ts']`；阈值 lines/statements/functions/branches ≥80%）。

**实测（2026-10-10，main）**：语句/行 **71.49%**，分支 **81.14%**，函数 **92.22%**。分目录：

| 目录 | 行% | 说明 |
| --- | --- | --- |
| core/commands | 97.15 | history.ts 100%，ops.ts 96.46 |
| core/layout | 97.80 | dagre.ts 100%，mindmap.ts 96.92 |
| core/model | 97.61 | factories 100%，schema 96.22 |
| core/io | 59.56 | mermaid 98.98 / serialize 100 / titleblock 100；export、importer、persist 未覆盖 |
| core/collab | 15.48 | diff 92.3；yjs.ts（网络适配器）未覆盖 |
| core（根文件） | 39.39 | palette 83.87；events/plugin 纯声明文件 0% |

**历史对照**：阶段 2 收口时实测 core 行覆盖 **93.7%**、分支 **82.4%**（记录在 `docs/DECISIONS.md`）。当前低于 80% 门禁的原因是阶段 5–7 新增的 `io/export.ts`、`io/importer.ts`、`io/persist.ts`、`collab/yjs.ts`、`events.ts` 尚无单测（前四者按契约属于 UI/IO/网络边界，计划在质量阶段补测或调整覆盖口径）。

## 5. 质量门实测结果

2026-10-10 对 `origin/main` 执行（Node 20.20.2、pnpm 10.34.6）：

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm typecheck` (`tsc -b`) | ✅ 通过 | strict，无错误 |
| `pnpm build` (`tsc -b && vite build`) | ✅ 通过 | dist 产物 ~143 kB JS（gzip ~46 kB） |
| `pnpm lint` (`eslint .`) | ❌ 1 error | `src/io/export.ts` 引入 `html-to-image`，违反 core 边界规则（见 §7 缺陷 D-01） |
| `pnpm test` | ⚠️ 31/32 | `history.test.ts`「无实质改动的命令不入栈」**计时敏感偶发失败**（见 §7 D-02） |
| `pnpm test:coverage` | ❌ 行覆盖 71.49% < 80% | 见 §4 与 §7 D-03 |

## 6. 性能测试方法

目标（SPEC §5）：**500 节点 + 800 连线时拖动平均每帧 < 20ms**。

方法与达成手段：

1. **渲染面**：React Flow `onlyRenderVisibleElements` 只挂可视区节点；自定义节点/连线 `React.memo`；`nodeTypes/edgeTypes` 模块级定义（避免每渲染新建引用）。
2. **订阅面**：zustand 选择器订阅（禁取整 store）；`selectFlowNodes/selectFlowEdges` 纯派生。
3. **过程态隔离**：拖动期间只动 React Flow 内部态，松手才 `execute` 一条命令——拖动不触发 immer 补丁与历史写入。
4. **测量**：Playwright 脚本生成 500 节点 + 800 连线的文档（localStorage 预置或命令批量构造），`requestAnimationFrame` 采样拖动全程帧间隔，报告平均帧时间；两档视口各跑一遍。真实数据将记录在 `docs/PERFORMANCE.md`（达到或达不到都如实记录）。

当前状态：画布阶段进行中，专项测量尚未执行（见 §7 D-04）。

## 7. 已知缺陷与限制

诚实清单（对应当前 main，随版本演进会更新）：

| 编号 | 严重度 | 描述 | 位置/复现 |
| --- | --- | --- | --- |
| D-01 | lint error | `src/io/export.ts` 直接 import `html-to-image`，违反「DOM 截图只允许出现在 features/io」的边界规则；`pnpm lint` 1 error | `eslint.config.js` no-restricted-imports；修法：截图调用上移到 `features/io`，core 只保留文本导出 |
| D-02 | flaky test | 「无实质改动的命令不入栈」对计时敏感：`executeCommand` 恒定写 `draft.updatedAt = now`，若 `Date.now()` 恰好跨毫秒则产生补丁导致入栈（期望不入栈）。同一命令两次运行曾分别通过/失败 | `src/core/commands/history.ts:42-47`；修法：仅当业务补丁非空时才更新 updatedAt/入栈，或在判断时排除 updatedAt 补丁 |
| D-03 | coverage | core 行覆盖 71.49% 低于 80% 门禁（阶段 5–7 新增文件未配测试） | 见 §4 |
| D-04 | 待测 | 性能专项（500 节点拖拽帧时间）与 SPEC §8 的 8 个 e2e 场景、axe 无障碍检查尚未实现 | `e2e/` 目前仅 smoke |
| D-05 | 功能边界 | 协作撤销对「目标元素已被他人删除」的情况跳过该补丁（immer 对不存在路径的 replace 不生效），表现为该元素无法恢复 | 已在 SPEC §7 声明 |
| D-06 | 功能边界 | 协作房间存内存、无鉴权、无持久化（服务重启文档丢失）；昵称为 `用户{clientID%100}` 自动生成，不可改 | `server/dev.mjs`、`yjs.ts` |
| D-07 | 功能边界 | Mermaid 仅为子集：不支持 subgraph、classDef、样式指令、注释外的高级语法；不认识的行跳过并计数 | `src/core/io/mermaid.ts` |
| D-08 | 平台 | 桌面优先：窗口 <1024 显示整屏提示，不做移动端适配 | `i18n/zh.ts` app.windowTooNarrow |
