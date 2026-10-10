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

实测：**18 个测试文件，96 个用例**（`pnpm test`，jsdom）。除下方早期清单外，本批次新增：

|| 文件 | 用例 | 覆盖点 |
|| --- | --- | --- |
|| `src/core/collab/yjs.test.ts`（7） | yjs 适配器：假 WebsocketProvider + 真 Y.Doc/Awareness | join/sync 双向初始化、pushLocal 差异写入、observeDeep 回填、pushCursor 节流、peers 汇总、leave 清理 |
|| `src/core/io/persist.test.ts`（4） | localStorage 持久化全路径 | newDoc/save/load 往返、listDocs 排序与计数、rename/duplicate/delete、损坏数据回退 |
|| `src/core/io/importer.test.ts`（7） | 导入器 | JSON 往返、非法输入报错、Mermaid 建图/skipped 计数/方向/自定义布局器、schema 自洽 |
|| `src/core/events.test.ts`（2） | 事件总线 | emit 派发 CustomEvent、detail 透传 |
|| `src/store/selectors.test.ts`（4+1） | 边默认选边 + 显式 handle | pickEdgeSides 四向、selectFlowEdges 显式 handle 保留 |
|| `src/core/commands/history.test.ts`（+1） | mergeWithPrevious | 同类命令合并且一次撤销整组（思维导图加节点+布局=一条历史） |
|| `src/core/model/schema.test.ts`（+） | zOrder 语义校验 | zOrder 与 nodes 不一致报错 |
|| `src/features/canvas/clipboard.test.ts`（5） | 剪贴板 | 复制内部连线、粘贴新 id/偏移、剪贴板内容 |
|| `src/io/export.test.ts`（5） | composeExportSvg | 背景三态、图框标题栏出现、标题栏预留空间 |
|| `src/features/shell/docs/docsStore.test.ts`（6） | 文档索引 | 索引/正文读写 |
|| `src/features/canvas/guides.test.ts`（5） | 对齐参考线 | 纯函数测算 |
|| `src/plugins/mindmap.test.ts`（11） | 思维导图树 | Tab/Enter 命令、整支删除、分支色、折叠 |

早期清单（沿用）：

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

配置：`e2e/`、`playwright.config.ts`（项目 `desktop-1440` 1440×900 与 `desktop-1280` 1280×720 双视口；`webServer` 自动拉起 `pnpm dev` 5173、`build:e2e`+预览 4173、`collab:server` 1234）。

已实现用例（全部断言 console 零 error/warning）：

| 文件 | 用例 |
| --- | --- |
| `e2e/smoke.spec.ts` | 首页渲染且控制台干净 |
| `e2e/stage34.spec.ts` | 首页入口卡、编辑器骨架、拖入形状→检查器→localStorage、快捷键面板、暗色编辑器 |
| `e2e/stage8.spec.ts` | 500n/800e 性能（4173 预览构建）、axe 首页+编辑器亮/暗 |
| `e2e/visual.spec.ts` | v1–v5 视觉基线截图 |
| `e2e/features.spec.ts` | SPEC §8 场景 1–7 |
| `e2e/collab.spec.ts` | SPEC §8 场景 8：两 browser context 同 `?room=` 双向同步 |

SPEC §8 场景对照（全部已实现）：

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

**实测（2026-10-11，main，批次 C 后）**：语句/行 **98.43%**，分支 **86.15%**，函数 **98.14%**。分目录：

| 目录 | 行% | 说明 |
| --- | --- | --- |
| core/commands | 100 | history/ops 均 100% |
| core/layout | 97.80 | dagre 100%，mindmap 96.92 |
| core/model | 97.70 | factories 100%，schema 96.42 |
| core/io | 99.45 | importer/mermaid/persist/serialize/titleblock 均 ≥99 |
| core/collab | 96.17 | diff 92.3，yjs 96.94（假 provider 驱动真 Y.Doc） |
| core（根文件） | 92.64 | events 100，palette 84.84；plugin/adapter/command/types 为纯类型声明文件 |

**历史对照**：阶段 2 收口 93.7% → 阶段 5–7 跌至 71.49%（新增 IO/网络文件未配测）→ 批次 C 补齐至 98.43%。

## 5. 质量门实测结果

2026-10-10 对 `origin/main` 执行（Node 20.20.2、pnpm 10.34.6）：

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm typecheck` (`tsc -b`) | ✅ 通过 | strict，无错误 |
| `pnpm build` (`tsc -b && vite build`) | ✅ 通过 | dist 产物 ~143 kB JS（gzip ~46 kB） |
| `pnpm lint` (`eslint .`) | ✅ 0 error 0 warning | D-01 违例已修（导出上移 `src/io/`） |
| `pnpm test` | ✅ 18 文件 96 用例全绿 | |
| `pnpm test:coverage` | ✅ 行 98.43 / 语句 98.43 / 函数 98.14 / 分支 86.15 | 阈值 80% 全过 |
| `pnpm exec playwright test` | ✅ 全绿 | 6 个 spec 文件 × 双视口 |

## 6. 性能测试方法

目标（SPEC §5）：**500 节点 + 800 连线时拖动平均每帧 < 20ms**。

方法与达成手段：

1. **渲染面**：React Flow `onlyRenderVisibleElements` 只挂可视区节点；自定义节点/连线 `React.memo`；`nodeTypes/edgeTypes` 模块级定义（避免每渲染新建引用）。
2. **订阅面**：zustand 选择器订阅（禁取整 store）；`selectFlowNodes/selectFlowEdges` 纯派生。
3. **过程态隔离**：拖动期间只动 React Flow 内部态，松手才 `execute` 一条命令——拖动不触发 immer 补丁与历史写入。
4. **测量**：Playwright 脚本生成 500 节点 + 800 连线的文档（localStorage 预置或命令批量构造），`requestAnimationFrame` 采样拖动全程帧间隔，报告平均帧时间；两档视口各跑一遍。真实数据将记录在 `docs/PERFORMANCE.md`（达到或达不到都如实记录）。

当前状态：已实测通过（`docs/PERFORMANCE.md`）：500n/800e 局部视口静态 p95≈17.8ms、拖拽合成事件 p95<1ms、全览 p95≈19ms，<20ms 达标。

## 7. 已知缺陷与限制

诚实清单（对应当前 main，随版本演进会更新）：

| 编号 | 严重度 | 描述 | 位置/复现 |
| --- | --- | --- | --- |
| D-01 | lint error（已修复）| `export.ts` 初版在 `core/io` 直接 import `html-to-image`，违反「DOM 截图只允许出现在 features/io」规则 → 已上移至 `src/io/export.ts`，core 只保留文本导出；现 lint 0 error | `eslint.config.js` no-restricted-imports |
| D-02 | flaky test（已修复）| 空命令不再入栈；96 用例全绿无 flaky | `src/core/commands/history.ts` |
| D-03 | coverage（已修复）| core 行覆盖 98.43% ≥80% | 见 §4 |
| D-04 | 待测（已修复）| 性能实测通过（PERFORMANCE.md）；SPEC §8 八场景 e2e 与 axe 已实现 | `e2e/features.spec.ts`、`collab.spec.ts`、`stage8.spec.ts` |
| D-09 | 功能边界（已修复）| 无显式 handle 的边曾统一从顶部把柄引出穿过节点——现按节点中心方位自动选边 | `src/store/selectors.ts` pickEdgeSides |
| D-10 | 功能边界（已修复）| 导出图框标题栏曾覆盖图内容——合成时预留 TITLE_BLOCK_H+间距 | `src/io/export.ts` |
| D-05 | 功能边界 | 协作撤销对「目标元素已被他人删除」的情况跳过该补丁（immer 对不存在路径的 replace 不生效），表现为该元素无法恢复 | 已在 SPEC §7 声明 |
| D-06 | 功能边界 | 协作房间存内存、无鉴权、无持久化（服务重启文档丢失）；昵称为 `用户{clientID%100}` 自动生成，不可改 | `server/dev.mjs`、`yjs.ts` |
| D-07 | 功能边界 | Mermaid 仅为子集：不支持 subgraph、classDef、样式指令、注释外的高级语法；不认识的行跳过并计数 | `src/core/io/mermaid.ts` |
| D-08 | 平台 | 桌面优先：窗口 <1024 显示整屏提示，不做移动端适配 | `i18n/zh.ts` app.windowTooNarrow |
