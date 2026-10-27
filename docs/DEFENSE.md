# DiagramStudio 答辩手册

> 本文档对应课程交付物清单第 7 项，按「给不懂前端的人看」的标准写：每条答案都标注相关文件路径，可对照代码追问。

## 目录

- [1. 项目一句话](#1-项目一句话)
- [2. 一页纸架构](#2-一页纸架构)
- [3. 技术选型理由](#3-技术选型理由)
- [4. 三条核心链路](#4-三条核心链路)
- [5. 最难的三个点与解法](#5-最难的三个点与解法)
- [6. 质量保障](#6-质量保障)
- [7. 设计模式 ↔ 文件速查](#7-设计模式--文件速查)
- [8. 演示口述稿（约 200 字）](#8-演示口述稿约-200-字)
- [9. 可能的追问与标准回答](#9-可能的追问与标准回答)
- [10. 局限与改进方向（坦率版）](#10-局限与改进方向坦率版)

## 1. 项目一句话

一个纯前端、可离线的在线图表编辑器：用一套「命令化 + 插件化」引擎同时支持流程图、思维导图、ER 图，文档模型即唯一真相源，撤销靠补丁回放，协作靠 Yjs CRDT 可选接入。

## 2. 一页纸架构

```text
features/   UI：画布(React Flow)、四角浮动条、上下文工具条、首页 —— 只发命令与事件，不直接改文档
   ↓ 订阅/调用
store/      zustand：documentStore(文档+历史) uiStore(界面态) collabStore(协作)
   ↓ 执行
plugins/    三个 DiagramPlugin：形状/连线默认/布局/键位/钩子/模板 —— 差异全在这里
   ↓ 依赖契约
core/       纯 TS：model · commands(命令+补丁历史) · layout · io · collab · events/palette/plugin
```

- 数据方向：UI 事件 → `execute(command)` → immer 补丁 → 新 doc → 选择器 → React Flow 重渲染。
- `src/core` 禁引 React/zustand/@xyflow（ESLint `no-restricted-imports` 强制），所以领域逻辑都能脱离浏览器单测。

## 3. 技术选型理由

| 选型 | 理由 | 代价/取舍 |
| --- | --- | --- |
| @xyflow/react (React Flow v12) | 画布交互（拖/选/连线/视口）成熟，`onlyRenderVisibleElements` 支撑 500+ 节点性能目标 | 定制节点/连线要写渲染件；用 `dsShape`/`dsEdge` 单类型 + data 携带文档对象收敛差异 |
| Zustand + immer patches | 状态小而薄；`produceWithPatches` 天然产出正/逆补丁=撤销历史的理想载体；选择器订阅控重渲染 | 历史上限 200 条防内存膨胀；补丁式历史对「远端删了本地要撤销的元素」只能跳过（限制已声明） |
| 插件架构（DiagramPlugin） | SPEC 硬约束：引擎不得出现 `type === 'x'` 分支；三种图=三个策略对象，新增图类型零改引擎 | 接口设计要预判差异点：原有 keymap、onDropOnNode、hiddenNodeIds、edgeFields、autoLayoutOnChange 等；UI 改版又加了 nodeActions、placeFromPalette、quickAddSides、nextKind、createBlank、tips 等可选钩子 |
| yjs + y-websocket | CRDT 免冲突合并；Y.Map 与 `Record<id,…>` 模型 1:1 同构；awareness 自带光标/在线状态 | 协议细节复杂→用 `CollabAdapter` 窄接口隔离；服务仅内存态，定位演示 |
| 其余 | dagre 布局（流程/ER）、d3-hierarchy（思维导图树）、html-to-image（PNG/SVG）、zod（导入校验） | Mermaid 没用官方解析器——子集手写（~240 行），可控且能报告 skipped |

## 4. 三条核心链路

**① 一次拖动 → 可撤销命令**：拖动期间只改 React Flow 内部态（文档不动）→ 松手 `execute(setNodePositions(...))` → `produceWithPatches` 收补丁入栈 → undo 回放 `inversePatches`。见 `src/store/documentStore.ts`、`src/core/commands/history.ts`。

**② 导出图片**：画布容器 DOM → `html-to-image` 的 `toPng/toSvg`（`ds-export-exclude` 过滤手柄等交互件）→ 可选 `frameSvg` 图框标题栏叠加 → `<a download>` 落盘。见 `src/io/export.ts`、`titleblock.ts`。

**③ 协作同步**：`join(room)` 建 `WebsocketProvider` → 本地 `execute` 后 `computeDocDiff` 在一次 `ydoc.transact` 写 nodes/edges/meta 三个 Y.Map → 服务端 y-protocols 广播 → 对端 `observeDeep` → `setDoc(remote:true)`（不进历史、不回播）。光标走 awareness，50ms 节流。见 `src/core/collab/*.ts`、`src/store/collabStore.ts`、`server/dev.mjs`。

## 5. 最难的三个点与解法

1. **「拖一次=一条历史」与过程态的矛盾**。拖动每秒几十次位置更新，若每次都进文档历史会爆炸、撤销会变成「抖回去」。解法：过程态只留在 React Flow 内部与画布局部 store，松手才提交一条命令；`coalesceKey` + 600ms 窗口把连续打字这类「逻辑上一次」的操作合并。命令的纯数据语义与交互语义分离（`resizeNode` 不约束最小尺寸——那是拖拽手柄的职责）。
2. **三种图「像又不是」**。思维导图要树语义（parentId/折叠/自动布局）、ER 要行内编辑和基数、流程图要标准形状——若写 `if type` 分支会污染所有模块。解法：`DiagramPlugin` 五个能力钩子把差异声明化；`ShapeRenderContext.dispatch` 给节点形状内部一个合规的命令通道（ER 字段、折叠圆钮都经它）；`hiddenNodeIds` 让「折叠隐藏子树」变成选择器层的普适过滤。
3. **协作不与撤销打架**。远端变更必须进文档但不能进本地历史（否则能撤销别人的操作），本地广播又不能被远端回填再触发（回声）。解法：`setDoc({remote:true, resetHistory:false})` 旁路写 doc 保留本地历史；`applyingRemote` 标志 + Yjs transaction origin 防回声；`computeDocDiff` 按 key 粒度 diff 最小化写入。

## 6. 质量保障

- **类型**：TS strict；禁 `any` 与 `@ts-ignore`（确需绕过用带说明的 `@ts-expect-error`）。
- **边界**：ESLint `no-restricted-imports` 强制 core 无 UI 依赖；`pnpm lint` 0 error 0 warning。
- **测试**：125 个 Vitest 单测（命令/历史/布局/校验/Mermaid/diff/yjs/persist/importer/对比度/i18n，以及改版新增的快捷添加、焦点交接、插件钩子、空白文档回收）；Playwright e2e 覆盖 SPEC §8 全部 8 场景（含双上下文协作同步）与上手流程，axe 无障碍检查，1440×900 与 1280×720 双视口。
- **覆盖率**：core 行/语句 98.78%、分支 87.40%、函数 99.08%，门槛 80% 已在 `vitest.config.ts` 固化。
- **测量要可信**：发现旧性能用例测的是浏览器帧时钟后，改用 CDP Trace 测主线程任务，并给出改版前后同口径对比（PERFORMANCE.md）。
- **一致性**：文档（本套 docs）与实现同仓演进；`docs/IMPL_CONTRACT.md` 冻结公共接口；`docs/DECISIONS.md` 记录取舍。

## 7. 设计模式 ↔ 文件速查

| 模式 | 文件 | 一句话 |
| --- | --- | --- |
| Command | `src/core/commands/command.ts`、`ops.ts` | `{label, coalesceKey, apply(draft)}`，文档唯一写入口 |
| Memento/Snapshot | `src/core/commands/history.ts` | immer 正/逆补丁栈，undo/redo 回放 |
| Strategy/Plugin | `src/core/plugin.ts`、`src/plugins/*.tsx` | 三种图=三个策略对象 |
| Factory | `src/core/model/factories.ts` | `createDoc/Node/Edge/createId` |
| Observer | `src/store/*`、`src/core/collab/yjs.ts`、`src/core/events.ts` | 选择器订阅、observeDeep、EV.* 事件 |
| Adapter | `src/core/collab/adapter.ts`、`yjs.ts` | yjs → 窄接口 |
| Composite | `src/core/model/types.ts`、`src/core/layout/mindmap.ts` | Record 聚合 + parentId 子树 |
| DTO | `src/core/io/persist.ts`、`src/core/collab/diff.ts` | `DocIndexEntry` 索引、`DocDiff` 差异对象 |

## 8. 演示口述稿（约 200 字）

「这是一个纯前端、可离线的在线图表编辑器，支持流程图、思维导图和 ER 图。界面是画布优先的：点一下形状就能直接打字，选中节点点四周的加号就能接下一步。它没有为三种图写三套编辑器——画布、工具条、撤销、导入导出是同一套引擎，差异全部收敛到插件接口。文档只通过命令对象修改，每条命令用 immer 补丁记录正/逆变更，所以撤销精确到字段级、还能合并连续操作。配色和文字全部走设计令牌，明暗两套主题对比度有单元测试保证。导出可以加工程制图风格的图框标题栏。协作是可拔插的：Yjs 的 CRDT 把每次命令的差异同步到房间，关掉协作产品依然完整。下面演示。」

## 9. 可能的追问与标准回答

1. **Q：撤销重做怎么实现的？**
   A：命令模式 + immer 补丁。`executeCommand` 用 `produceWithPatches` 拿 `patches/inversePatches` 入栈（`HistoryEntry`）；`undoCommand` 回放逆补丁、`redoCommand` 回放正补丁。无实质改动不入栈、上限 200 条。`src/core/commands/history.ts`

2. **Q：为什么不用「每次操作存一份文档快照」？**
   A：500 节点文档快照内存开销大且 diff 不可知；补丁只记变化路径，体积小、可合并（coalesceKey 600ms）、可精确回放。immer 结构共享让新旧 doc 复用未变子树，比较 `r.doc === doc` 还能探出空命令。

3. **Q：拖动一次产生几十条历史怎么办？**
   A：拖动过程态只进 React Flow 内部/画布局部 store，不进文档；松手才 `execute` 一条命令。连续打字等高频操作用 `coalesceKey` + 600ms 窗口合并成一条，label 保留首条。

4. **Q：三种图的差异怎么组织？**
   A：策略模式。`DiagramPlugin` 声明 `shapes/edgeDefaults/layout/keymap/onDropOnNode/autoLayoutOnChange/hiddenNodeIds/edgeFields/nodeActions/placeFromPalette/templates` 等；引擎查能力位不判断 `type`（如连线工具条看 `edgeFields === 'cardinality'` 显示基数，形状坞点击先问 `placeFromPalette`——同一个「点主题」在思维导图里挂到所选主题下）。`src/core/plugin.ts`、`src/plugins/`

5. **Q：core 为什么禁止 import React？**
   A：让领域逻辑（命令/布局/解析/diff）脱离浏览器可单测——上百个单测数秒内跑完；也让 core 可换画布/协作实现而不动。由 ESLint `no-restricted-imports` 强制（`eslint.config.js`），不是自律。

6. **Q：数据为什么用 `Record<id, T>` 而不是数组？**
   A：三个原因同源：immer 补丁路径稳定（`nodes.n3.x` 而非 `nodes[2].x`，数组重排会改写索引）；Y.Map 以 key 为粒度天然同构；查找 O(1)。`zOrder` 单列管叠放。`src/core/model/types.ts`

7. **Q：协作怎么做到「可拔插」？**
   A：适配器模式。`CollabAdapter` 只有 `join/pushLocal/pushCursor/leave` 四个方法加三个回调；`collabStore` 面向接口，`documentStore` 经 `setCollabBroadcast` 钩子广播——没注册就完全单机。`src/core/collab/adapter.ts`

8. **Q：远端改动会不会进我的撤销历史？**
   A：不会。远端文档经 `setDoc({resetHistory:false, remote:true})` 合入：保留我的历史栈、标记 remote 不再回播。撤销只应用我自己的逆补丁；目标被他人删除时该补丁自然跳过（已知限制）。

9. **Q：两个人同时改同一节点会怎样？**
   A：yjs 的 Y.Map 是 LWW（last-write-wins）按 key 合并——后到的整节点覆盖；不做字段级合并。演示场景可接受，是已知限制；光标/在线状态走 awareness 不参与文档合并。

10. **Q：协作服务挂了还能用吗？**
    A：能。适配器失败只是 `status: offline`，文档、历史、导入导出全部不受影响——SPEC §7 的硬要求，接口隔离保证的。

11. **Q：Mermaid 为什么手写解析器？**
    A：官方 mermaid 解析器体积大且目标是渲染不是模型；我们需要的是「文本→DiagramDoc」。手写 ~240 行只覆盖子集（`graph TD/LR`、8 种节点记号、5 种连线、标签、链式），不认识的行跳过计数提示用户——可控、可测、可往返（导出能被自己读回）。`src/core/io/mermaid.ts`

12. **Q：导入不可信文件怎么防御？**
    A：zod schema 全字段校验（`docSchema`）+ 语义层引用完整性（`semanticCheck`：悬空连线、zOrder 幽灵 id）；错误经 `describeIssue` 翻成中文给用户（「字段 x 应为数字，当前类型是 string」）。`src/core/model/schema.ts`

13. **Q：大文档（500 节点）不卡靠什么？**
    A：五招：React Flow `onlyRenderVisibleElements` 只渲染可视区；自定义节点/连线 `React.memo`；zustand 选择器订阅不取整 store；拖动过程态不触发 immer/历史；只给有标注的连线挂 `EdgeLabelRenderer`（它每次 store 更新都要 querySelector，CPU profile 里的第一热点）。测量用 CDP Trace 统计真实拖动时的主线程任务（PERFORMANCE.md）。

   **追问：你们之前不是说帧耗 17.8ms 吗？** A：那个数字后来被我们自己推翻了——空白页的 rAF 间隔也是 17.8ms，说明测到的是无头浏览器的出帧节奏；合成的 pointermove 也没有真正触发拖拽。所以改成测主线程任务，并保留改版前后同口径对比。

14. **Q：React Flow 的 nodes/edges 和文档什么关系？**
    A：派生关系。文档是唯一真相源；`selectFlowNodes/selectFlowEdges(doc, plugin)` 纯函数把 doc 映射成 React Flow 结构（含 zIndex、hidden 过滤），不单独存一份状态——避免双真相源漂移。`src/features/canvas/selectors.ts`

15. **Q：主题怎么做到「换肤不换文档」？**
    A：颜色不存色值存 palette key。`node.style.fill` 是 `'teal'` 这类键，`resolveFill(key, theme)` 按当前主题查表；界面色走 `tokens.css` CSS 变量，`.dark` class 整体切换。导出时把解析后的颜色传进去。`src/core/palette.ts`、`src/styles/tokens.css`

16. **Q：文字对比度 4.5:1 怎么保证？**
    A：不是声称是测的——`core.test.ts` 用 `contrastRatio`（WCAG luminance 公式）对 7 对节点配色 × 明暗底逐对断言 ≥4.5:1，配错颜色会被测试拦住。`src/core/core.test.ts`

17. **Q：快捷键/菜单和画布怎么解耦？**
    A：观察者模式的事件总线。`EV.*` 是纯字符串常量（`ds:align` 等），按键/菜单只 `emit`，所有者 feature 监听执行——快捷键模块不需要 import 画布。`src/core/events.ts`、IMPL_CONTRACT §5 所有权表

18. **Q：思维导图折叠/改父级怎么实现的？**
    A：树寄生在通用节点上：`data.parentId` 表达父子；`collapsedDescendants` 算隐藏集合交给 `hiddenNodeIds`；拖放改父级走 `onDropOnNode` 钩子（拒绝拖进自己子树成环）；`autoLayoutOnChange` 让每次变动后自动重排。`src/core/layout/mindmap.ts`、`src/plugins/mindmap.tsx`

19. **Q：ER 字段行内编辑不违反「只能经命令改文档」吗？**
    A：不违反——形状 `render` 拿到 `ctx.dispatch`，字段增删改都是 `patchNode` 命令进历史，只是命令的发起方从工具条换成了节点自己。`src/plugins/er.tsx`、`ShapeRenderContext.dispatch`

20. **Q：测试覆盖了多少？哪里没覆盖？**
    A：125 个单测，core 行覆盖 98.78%。连网络边界也覆盖了——`collab/yjs` 用假 WebsocketProvider 驱动真 Y.Doc 与 Awareness，sync/pushLocal/observeDeep/awareness/节流全路径有断言。`plugin.ts`/`adapter.ts`/`command.ts`/`types.ts` 是纯类型声明文件无可执行行。TEST_REPORT §4。

21. **Q：localStorage 方案有什么风险？**
    A：容量 ~5MB、清浏览器数据即丢、无多端同步——这是刻意的取舍（个人作业、离线优先）。索引（`DocIndexEntry`）与正文分键存储，列表页不读全文；导出 JSON 是备份通道。`src/core/io/persist.ts`

22. **Q：如果再加一种图（如时序图）要改哪些文件？**
    A：只加一个插件文件 + `registerPlugin`：声明 shapes（含图标）、edgeDefaults、layout（可复用 dagre 或另写）、需要的话加 keymap/钩子、tips、templates。画布/工具条/形状坞/历史/导入导出零改动——这正是插件架构要证明的点。

24. **Q：为什么改版去掉了检查器和图类型切换？**
    A：改版前我们以新用户身份走了一遍，列出 10 个具体问题（REDESIGN.md §1）：检查器分组默认折叠、未选中时 280px 空白；「切换图类型」会把整份文档改坏；空画布提示的「双击放节点」实际是双击缩放……改版原则是画布优先、渐进披露、就地操作、加完直接打字。实现上没有破坏架构：差异仍然只进插件，新加的都是可选钩子；每个改动都有单测或 e2e 覆盖，前后截图与性能都有同口径对比。

23. **Q：项目最大的工程决策是什么？**
    A：「文档唯一真相源 + 命令唯一写入口」。它让撤销、协作、校验、测试四件难事都变简单：撤销=补丁回放；协作=对同一份 doc 做 diff；校验=对一个 POJO 跑 zod；测试=对纯函数传对象。

## 10. 局限与改进方向（坦率版）

**当前局限**（不掩饰）：

- 协作是「演示级」：房间存内存、无鉴权、无持久化；同 key 冲突 LWW 整节点覆盖；协作撤销跳过已被删元素。
- Mermaid 仅为子集；不做 subgraph/样式指令。
- 桌面优先：<1024 宽仅提示，无移动端/触屏精细适配。
- 性能：500n/800e 局部视口拖拽主线程任务 p95 约 12–14ms；但全览（500 节点全可见）拖拽每步主线程约 137ms，受控模式下每帧全量处理节点数组（PERFORMANCE.md §5）。

**改进方向**：

1. 协作升级：Hocuspocus/持久化后端、字段级冲突合并、可选昵称。
2. 全览场景：拖动期间改为只更新被拖节点（非受控/增量更新），去掉每帧全量节点处理。
3. Mermaid 子集扩语法（subgraph、注释、更多节点形状）。
4. 组件级渲染测试补齐（features/ 的交互逻辑已有单测，渲染目前靠 e2e 与截图覆盖）。
