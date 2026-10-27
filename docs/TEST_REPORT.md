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
| 交互逻辑单测 | Vitest + jsdom（真实 zustand store） | 快捷加号、统一建节点/连线、焦点交接、多选改色、插件上手钩子、空白文档回收 | REDESIGN.md §7 |
| 动效 | Vitest 假时钟 + Playwright（开启 / 减少动态效果两种偏好） | 动效规划、补间、对账→帧→清理全链路；页面转场、连线跟随、残影、不进历史、减少动态效果下零动效 | docs/MOTION.md §8 |
| 端到端 | Playwright + @axe-core/playwright | SPEC §8 的 8 个场景；两档视口 1440×900 / 1280×720；默认以「减少动态效果」运行（截图/计数/axe 不受动画中间态影响） | `playwright.config.ts` |
| 质量门 | eslint / tsc -b / vitest --coverage / vite build | lint 零警告、core 行/语句/函数/分支覆盖 ≥80% | `vitest.config.ts` 阈值 |

设计原则：`src/core` 禁引 React/zustand/@xyflow（ESLint 强制），因此领域逻辑全部可在毫秒级单测中验证；UI 正确性交给 e2e 与视觉截图。

## 2. 单元测试清单（Vitest）

实测（2026-10-21，动效批次后）：**26 个测试文件，152 个用例**（`pnpm test`，jsdom）。

动效批次新增：

| 文件 | 用例 | 覆盖点 |
| --- | --- | --- |
| `src/features/canvas/motion/plan.test.ts`（11） | 动效规划 | 位移补间起止、最小位移与拖动中不补间、子主题从父节点中心长出、展开多层子树沿父链散开、「+」从连线另一端飞出而撤销类原地出现、折叠收回父节点/删除原地淡出、撤销加子主题按旧父链收回、父链成环不死循环、自绘次序（含回边成环）、自绘延迟递增且总时长有上限 |
| `src/features/canvas/motion/tween.test.ts`（5） | 位置补间（假时钟） | 插值与精确终点、拖动接管后不再写入、全部跳到终点与剩余时长、连续卡顿直接收尾、缓动端点与回弹 |
| `src/features/canvas/motion/canvasMotion.test.ts`（8） | 动效编排（假时钟 + 假定时器） | 不允许动效时原样返回、示例自绘/普通打开不播、加子主题飞出并落在文档位置、两段式改目标不跳回、删除残影到期移除、撤销提示圈与微移直接到位、finish 跳到终点、StrictMode 重挂载 |
| `src/features/canvas/derive.test.ts`（3） | 派生元素 | 未变节点/连线沿用上一帧对象、变了的保留 measured（尺寸变则不保留）、选中状态还原 |

改版批次新增 / 更新：

| 文件 | 用例 | 覆盖点 |
| --- | --- | --- |
| `src/features/canvas/quickAdd.test.ts`（10） | 快捷加号与建节点 | 起止后接处理且连线、占位时向外找空位、ER 默认基数、已连线侧推算、`createShapeNode` 居中/吸附/私有数据不共享、`createPluginEdge` 默认线型、`executeAndFocus` 选中并进入编辑、多选改色一次撤销 |
| `src/plugins/hooks.test.ts`（8） | 插件上手钩子 | 空白导图自带中心主题、形状坞挂到所选/根下、无根时补中心主题、根上「加同级」退化为加子、关闭快捷加号、`nextKind`、ER「添加字段」同步高度、三插件都有提示与图标 |
| `src/features/shell/docs/pristine.test.ts`（2） | 空白文档回收 | 未编辑离开即删除、编辑过则保留 |
| `src/features/shell/home/time.test.ts`（2） | 相对时间 | 分钟/小时/天分档、超过一周显示日期 |
| `src/core/core.test.ts`（+2） | 配色 | 强调色在面板上 ≥4.5:1、同色相描边与底色 ≥1.8:1 且 `ink` 跟随底色 |
| `src/core/io/importer.test.ts`（+1） | Mermaid 路由注入 | 注入 `step` 覆盖默认曲线，不注入保持原样 |
| `src/io/export.test.ts`（改） | 点阵背景 | canvas 底色 + 24px 圆点 pattern |
| `src/i18n/zh.test.ts`（3） | 文案契约 | 新命名空间齐全、三种图都有空状态与提示、`fmt` 占位符 |

早期批次新增（沿用）：

|| 文件 | 用例 | 覆盖点 |
|| --- | --- | --- |
|| `src/core/collab/yjs.test.ts`（7） | yjs 适配器：假 WebsocketProvider + 真 Y.Doc/Awareness | join/sync 双向初始化、pushLocal 差异写入、observeDeep 回填、pushCursor 节流、peers 汇总、leave 清理 |
|| `src/core/io/persist.test.ts`（4） | localStorage 持久化全路径 | newDoc/save/load 往返、listDocs 排序与计数、rename/duplicate/delete、损坏数据回退 |
|| `src/core/io/importer.test.ts`（7） | 导入器 | JSON 往返、非法输入报错、Mermaid 建图/skipped 计数/方向/自定义布局器、schema 自洽 |
|| `src/core/events.test.ts`（2） | 事件总线 | emit 派发 CustomEvent、detail 透传 |
|| `src/features/canvas/selectors.test.ts`（4+1） | 边默认选边 + 显式 handle | pickEdgeSides 四向、selectFlowEdges 显式 handle 保留 |
|| `src/core/commands/history.test.ts`（+1） | mergeWithPrevious | 同类命令合并且一次撤销整组（思维导图加节点+布局=一条历史） |
|| `src/core/model/schema.test.ts`（+） | zOrder 语义校验 | zOrder 与 nodes 不一致报错 |
|| `src/features/canvas/clipboard.test.ts`（5） | 剪贴板 | 复制内部连线、粘贴新 id/偏移、剪贴板内容 |
|| `src/io/export.test.ts`（5） | composeExportSvg | 背景三态、图框标题栏出现、标题栏预留空间 |
|| `src/features/shell/docs/newDoc.test.ts`（2） | 新建文档 | 模板实例化、空白文档 |
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
| `e2e/stage34.spec.ts` | 首页新建卡与空列表、四角浮动条/形状坞/空画布引导、拖入→工具条出现→localStorage、双击空白放节点（不被缩放吞掉）、快捷键面板、深色编辑器 |
| `e2e/stage8.spec.ts` | 500n/800e 真实拖拽主线程任务（CDP Trace，局部视口断言 p95<50ms、全览记录）、axe 首页+编辑器亮/暗 |
| `e2e/visual.spec.ts` | v1–v5 视觉定景截图（`VISUAL_DIR` 可改输出目录，改版前后对比即由它生成） |
| `e2e/features.spec.ts` | SPEC §8 场景 1–7 + 1b「形状坞点击→打字→快捷加号→工具条改色」 |
| `e2e/collab.spec.ts` | SPEC §8 场景 8：分享弹层开启协作，两 browser context 同 `?room=` 双向同步 |
| `e2e/guide.spec.ts` | 用户手册 8 张配图（仅 1440 档） |
| `e2e/motion.spec.ts` | 动效（开启动效）：m1 首页形变进编辑器 + 画布自绘、播完无残留类名/转场命名、焦点落在画布；m2 Tab 加子主题逐帧采样，连线终点相对节点锚点的偏移全程不变；m3 删除残影立即出现且 `aria-hidden`+`inert`、真实节点数立即正确；m4 自动布局一次撤销回到原位（动效不进历史）；m5 连线工具条改样式不重建不丢焦点；m6（减少动态效果）全程零转场、零动效类名、无在播动画 |

共用助手：`e2e/helpers.ts`（新建/示例、拖入、把柄连线、选边、`settle` 等动效播完、`openWithoutTransition`）、`e2e/perf.ts`（CDP Trace 主线程统计）。实测（2026-10-21，动效批次后）：1440 档 40 个、1280 档 32 个（另 8 个手册配图在 1280 档跳过），全部通过。

> 测试环境注意：配置里为测真实帧耗加了 `--disable-frame-rate-limit --disable-gpu-vsync`。这种无头模式下一旦播过 View Transition，`requestAnimationFrame` 就不再触发（默认参数与真实浏览器无此问题），Playwright 的点击稳定性检查会一直等待；因此除 m1 外的动效用例与性能用例都「不经转场进入编辑器后再打开动效」。应用侧另有 1.5s 转场看门狗。

SPEC §8 场景对照（全部已实现）：

| # | 场景 | 关键断言 |
| --- | --- | --- |
| 1 | 模板新建流程图→拖入形状→连线→改文字→撤销重做 | 节点出现、连线出现、文本更新、undo 回退 |
| 2 | 思维导图 Tab/Enter 建树（新主题直接打字）→折叠→整支删除→撤销 | 空白导图自带中心主题、子/同级生成且文字正确、子树隐藏与恢复 |
| 3 | ER 图新增实体、字段与关系 | 新实体预置 id 主键、字段行增改、默认基数、工具条改终点基数 |
| 4 | 导出 JSON→再导入一致；导出 PNG 非空 | 往返文档等价；PNG 字节数 >0 |
| 5 | 导入 Mermaid | 节点/连线数量与 skipped 提示 |
| 6 | 自动保存后刷新仍在 | reload 后文档内容一致 |
| 7 | 切换主题并记住 | html.dark class、localStorage `ds:theme` |
| 8 | 两窗口协作同步 | 一端改动在另一端出现（需 `dev:collab`） |

全部 e2e 均断言 console 零 error/warning；首页与编辑器用 `@axe-core/playwright` 检查，不得有 serious/critical 级问题。

## 4. 覆盖率

`vitest run --coverage`（v8 provider，`include: ['src/core/**/*.ts']`；阈值 lines/statements/functions/branches ≥80%）。

**实测（2026-10-21，UI 改版后）**：语句/行 **98.78%**，分支 **87.40%**，函数 **99.08%**。分目录：

| 目录 | 行% | 说明 |
| --- | --- | --- |
| core/commands | 100 | history/ops 均 100% |
| core/layout | 100 | dagre、mindmap |
| core/model | 97.70 | factories 100%，schema 96.42 |
| core/io | 99.45 | importer/mermaid/persist/serialize/titleblock 均 ≥99 |
| core/collab | 96.20 | diff、yjs（假 provider 驱动真 Y.Doc） |
| core（根文件） | 96.47 | events、palette（新增 `resolveStroke` 已覆盖）；plugin/adapter/command/types 为纯类型声明文件 |

**历史对照**：阶段 2 收口 93.7% → 阶段 5–7 跌至 71.49%（新增 IO/网络文件未配测）→ 批次 C 补齐至 98.43% → 改版后 98.78%。

## 5. 质量门实测结果

2026-10-21 对 `redesign/canvas-first` 执行（Node 22、pnpm 10.34.6）：

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm typecheck` (`tsc -b`) | ✅ 通过 | strict，无错误 |
| `pnpm build` (`tsc -b && vite build`) | ✅ 通过 | vendor 按库拆为 react/xyflow/radix/yjs/layout/vendor，每个 chunk <200 kB；应用 chunk 131 kB（gzip 45 kB）；无体积警告（zod 自带的 2 条注释提示与改版前相同） |
| `pnpm lint` (`eslint .`) | ✅ 0 error 0 warning | |
| `pnpm test` | ✅ 22 文件 125 用例全绿 | |
| `pnpm test:coverage` | ✅ 行 98.78 / 语句 98.78 / 函数 99.08 / 分支 87.40 | 阈值 80% 全过 |
| `pnpm exec playwright test` | ✅ 全绿 | 7 个 spec 文件 × 双视口（手册配图仅 1440） |

## 6. 性能测试方法

目标：**500 节点 + 800 连线真实拖动时主线程无长任务**（任务 p95 < 50ms）。原目标「平均每帧 < 20ms」的测量方式经复查测的是无头浏览器帧时钟（空白页同样 17.8ms），已替换，详见 `docs/PERFORMANCE.md` §1。

方法：Playwright `mouse.down/move/up` 真实拖动 40 步；期间用 CDP Tracing 采集渲染主线程每个 `RunTask` 的耗时，统计 p50/p95/max 与总忙碌时长（`e2e/perf.ts`）。生产构建、1440×900。

达成手段：`onlyRenderVisibleElements`；节点/连线 `React.memo`；zustand 选择器订阅；拖动期间只动 React Flow 内部态、松手才提交命令；**只给有标注的连线挂 EdgeLabelRenderer**（改版中发现的第一热点）；节点不用 transform 动画与 CSS filter。

当前状态（2026-10-21）：局部视口任务 p95 12–14ms、主线程忙碌比改版前少约 20%；全览忙碌少约 65%、最长任务 ~560ms → ~160ms。

## 7. 已知缺陷与限制

诚实清单（对应当前 main，随版本演进会更新）：

| 编号 | 严重度 | 描述 | 位置/复现 |
| --- | --- | --- | --- |
| D-01 | lint error（已修复）| `export.ts` 初版在 `core/io` 直接 import `html-to-image`，违反「DOM 截图只允许出现在 features/io」规则 → 已上移至 `src/io/export.ts`，core 只保留文本导出；现 lint 0 error | `eslint.config.js` no-restricted-imports |
| D-02 | flaky test（已修复）| 空命令不再入栈；96 用例全绿无 flaky | `src/core/commands/history.ts` |
| D-03 | coverage（已修复）| core 行覆盖 98.43% ≥80% | 见 §4 |
| D-04 | 待测（已修复）| 性能实测通过（PERFORMANCE.md）；SPEC §8 八场景 e2e 与 axe 已实现 | `e2e/features.spec.ts`、`collab.spec.ts`、`stage8.spec.ts` |
| D-09 | 功能边界（已修复）| 无显式 handle 的边曾统一从顶部把柄引出穿过节点——现按节点中心方位自动选边 | `src/features/canvas/selectors.ts` pickEdgeSides |
| D-10 | 功能边界（已修复）| 导出图框标题栏曾覆盖图内容——合成时预留 TITLE_BLOCK_H+间距 | `src/io/export.ts` |
| D-05 | 功能边界 | 协作撤销对「目标元素已被他人删除」的情况跳过该补丁（immer 对不存在路径的 replace 不生效），表现为该元素无法恢复 | 已在 SPEC §7 声明 |
| D-06 | 功能边界 | 协作房间存内存、无鉴权、无持久化（服务重启文档丢失）；昵称为 `用户{clientID%100}` 自动生成，不可改 | `server/dev.mjs`、`yjs.ts` |
| D-07 | 功能边界 | Mermaid 仅为子集：不支持 subgraph、classDef、样式指令、注释外的高级语法；不认识的行跳过并计数 | `src/core/io/mermaid.ts` |
| D-08 | 平台 | 桌面优先：窗口 <1024 显示整屏提示，不做移动端适配 | `i18n/zh.ts` app.windowTooNarrow |
| D-11 | 交互（已修复，改版）| 空画布提示「双击放节点」，实际被 React Flow 双击缩放吞掉（放大到 200%） | `useCanvasWiring` `zoomOnDoubleClick:false` + stage34 用例 |
| D-12 | 交互（已修复，改版）| 空文档放第一个节点被初始 fitView 拽到正中，第二个落点与之重叠 | `useCanvasWiring` `useFitOnOpen`；features 场景 3 覆盖 |
| D-13 | 交互（已修复，改版）| 思维导图折叠钮被派生连线的重连热区挡住，点击无效 | `selectors.ts` 派生边 `reconnectable:false, zIndex:0`；features 场景 2 |
| D-14 | 交互（已修复，改版）| 顶栏「切换图类型」把整份文档改成另一类型，节点退化为方框 | 控件与 `setDocType` 删除 |
| D-15 | 测试（已修复，改版）| 性能用例测的是帧时钟、合成事件未触发拖拽，阈值判定无效 | `e2e/perf.ts` + `stage8.spec.ts` 重写 |
| D-16 | 性能（已修复，改版）| 每条连线都挂 EdgeLabelRenderer，800 条边每帧 800 次 querySelector | `DsEdge.tsx` 按需挂载 |
| D-17 | 文档（已修复，改版）| README 引用的两张截图不存在；首页思维导图缩略图错乱（未布局即缩画） | README 指向手册配图；`MiniDiagram` 先布局 |
| D-18 | 性能边界 | 全览（500 节点全可见）拖拽每步主线程约 137ms：受控模式下每帧全量处理节点数组 | 见 PERFORMANCE.md §5，未修 |
