# 实施约定（IMPL_CONTRACT）

所有阶段子代理开工前必须完整阅读本文件与 docs/SPEC.md。SPEC 定义「做什么」，本文件定义「接口与分工」。两者冲突时以本文件为准；确需变更契约，先改本文件并在 docs/DECISIONS.md 记录理由。

## 0. 环境

- 项目根目录：`/home/ubuntu/repos/diagramstudio`，本文件所有路径相对此目录。
- 任何 node/pnpm/npx 命令前先执行：
  `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20`
- Node 20.x + pnpm 10.x。不得用 npm/yarn 装依赖。依赖装完后项目必须完全离线可运行。
- 只许使用 SPEC §2 列出的依赖；确需新增，先在 DECISIONS.md 写明理由再加。
- Playwright：优先 `pnpm exec playwright install chromium` 用自带浏览器；若系统库缺失跑不起来，playwright.config.ts 改用 `channel: 'chrome'` 调系统 Chrome（本机已装 google-chrome）。
- 阶段 3 与 4 并行执行：如需起 dev server，画布用端口 5201，外壳用 5202；不要互相重启对方的进程。

## 1. 阶段与目录所有权

只有「所有者」可以创建/修改对应路径；其他阶段只读引用。公共文件（见 §8）按规则追加。

| 路径 | 所有者 | 内容 |
| --- | --- | --- |
| package.json、tsconfig、vite/eslint/tailwind/postcss/playwright 配置、index.html、src/main.tsx、src/styles/、src/i18n/zh.ts(骨架) | 阶段1 脚手架 | 工程基建；zh.ts 之后各阶段只追加自己的命名空间 |
| src/core/** | 阶段2 核心 | 纯 TS：model、commands/history、layout、io、palette、events、plugin 接口、collab 接口 |
| src/store/documentStore.ts、src/store/uiStore.ts、src/store/selectors.ts | 阶段2 核心 | store 公共 API 在本文件冻结，后续阶段只调用不改签名 |
| src/plugins/** | 阶段5 插件 | registry 与各插件实现（阶段2 预置 registry 与最小基座插件） |
| src/features/canvas/** | 阶段3 画布 | EditorCanvas 及画布内一切交互；可在本目录建局部 store |
| src/features/topbar/ palette/ inspector/ menus/ shortcuts/、src/App.tsx、src/components/** | 阶段4 外壳 | 顶栏、面板、检查器、菜单、快捷键、主题、提示条 |
| src/features/home/**、src/features/io/**、localStorage 持久化 | 阶段6 文档与IO | 首页、模板、自动保存、导入导出、图框标题栏 |
| src/core/collab/**、src/store/collabStore.ts、server/ | 阶段7 协作 | yjs 协作 |
| e2e/**、性能与无障碍专项、src/ 内缺陷修复 | 阶段8 质量 | 修 bug 可跨目录小改，但保持所有权边界 |
| docs/**、PROGRESS.md、DECISIONS.md | 各阶段共用 | 见 §8 追加规则 |

## 2. 数据模型（src/core/model/）

按 SPEC §4：types.ts 定义 DiagramDoc/DiagramNode/DiagramEdge/DiagramType；factories.ts 提供 createDoc/createNode/createEdge；schema.ts 提供一一对应的 zod schema（导入校验只走 schema）。补充约定：

- `DiagramNode.data: Record<string, unknown>`，各插件自行收窄：mindmap 用 `{ parentId: string | null; collapsed?: boolean }`；er 用 `{ fields: ErField[] }`，`ErField = { id: string; name: string; type: string; pk?: boolean; fk?: boolean }`。
- `DiagramNode.size: { w: number; h: number }`，`position: { x: number; y: number }`。
- `DiagramEdge.cardinality?: { source: '1'|'0..1'|'N'|'0..N'; target: 同左 }`（仅 ER）。
- `zOrder` 存节点 id 数组，靠后在上；派生 React Flow nodes 时按 zOrder 排 `zIndex`。

## 3. Store 公共 API（src/store/，阶段2 实现，签名冻结）

```ts
// documentStore.ts —— 文档唯一真相源，组件只许用选择器订阅
interface DocumentStore {
  doc: DiagramDoc
  canUndo: boolean; canRedo: boolean
  undoLabel: string | null; redoLabel: string | null
  execute(cmd: Command): void          // 所有文档修改的唯一入口
  undo(): void; redo(): void
  setDoc(doc: DiagramDoc): void        // 导入/加载/协作远端写入，不进历史
}

// uiStore.ts —— 非文档界面状态
interface UiStore {
  route: 'home' | 'editor'
  theme: 'light' | 'dark' | 'system'   // resolvedTheme 由主题监听维护
  resolvedTheme: 'light' | 'dark'
  tool: 'select' | 'hand'
  leftPanelOpen: boolean; rightPanelOpen: boolean
  minimapVisible: boolean
  zoom: number                          // 画布写，顶栏读
  selection: { nodeIds: string[]; edgeIds: string[] }
  textEditing: boolean                  // 节点文字编辑中：快捷键总线据此放行按键
  toasts: { id: string; kind: 'info' | 'success' | 'error'; text: string }[]
  shortcutsHelpOpen: boolean
  lastSavedAt: number | null
  setRoute(r): setTheme(t): setTool(t): toggleLeftPanel(): toggleRightPanel():
  setMinimapVisible(b): setZoom(z): setSelection(sel): setTextEditing(b):
  pushToast(kind, text): dismissToast(id): setShortcutsHelpOpen(b): setLastSavedAt(ts)
}

// selectors.ts —— 派生选择器（canvas/inspector 共用）
selectFlowNodes(doc, plugin): Node[]     // 文档 → React Flow nodes（含 zIndex）
selectFlowEdges(doc, plugin): Edge[]     // 文档 → React Flow edges
selectSelectedNodes(doc, sel): DiagramNode[]
selectSelectedEdges(doc, sel): DiagramEdge[]
```

阶段3 需要的过程态（对齐参考线、框选矩形等）放 `features/canvas/` 内的局部 store 或 React Flow 内部，不进 uiStore。

## 4. 插件契约（src/core/plugin.ts + src/plugins/registry.ts）

SPEC §4 的 `DiagramPlugin` 接口不变，补充：

- `ShapeDef = { kind: string; name: string; icon?: string; defaultSize: {w,h}; defaultText?: string; render(node, ctx): ReactNode }`——render 只许用 SVG/div + tokens 变量；kind 是 `DiagramNode.kind` 的取值。`ctx = { editing: boolean; dispatch(cmd: Command): void }`：ER 表格节点的行内编辑经 `ctx.dispatch` 提交命令。`defaultText` 是拖入/双击创建时的初始文字（ER 实体/弱实体默认名）。
- `plugin.keymap` 上下文 `EditorContext = { doc, selection, dispatchEvent(e) }`，返回 `Command | null`。
- 可选钩子：`plugin.onDropOnNode?(doc, draggedNodeId, targetNodeId): Command | null`（思维导图拖动改父级用）；`plugin.autoLayoutOnChange?: boolean`（思维导图 true：文档变动后画布自动调 plugin.layout，300ms 过渡，是一条命令）；`plugin.edgeFields?: 'cardinality'`（ER true：检查器据此渲染两端基数下拉，不判断 type）；`plugin.hiddenNodeIds?(doc): Set<string>`（思维导图折叠子树）；`plugin.expandDeletion?(doc, nodeIds): string[]`（思维导图整支删除/剪切）；`plugin.edgeAxis?: 'auto' | 'horizontal'`（无显式锚点边的默认出线方向，思维导图 horizontal 恒取左右）。
- registry：`registerPlugin(p)`、`getPlugin(type): DiagramPlugin`、`getAllPlugins(): DiagramPlugin[]`。
- 阶段2 在 registry 预置一个「基座插件」：对三种 type 返回同一套通用形状（矩形、圆角、菱形、圆柱）+ dagre 布局 + 一个简单模板，使阶段3/4 有可渲染的真实接口；阶段5 用完整实现替换各 type 的注册项。
- 禁止在 canvas/inspector/io 里写 `type === 'mindmap'` 分支；差异全在插件。

## 5. 跨模块事件（src/core/events.ts，纯字符串常量，core 不引 DOM）

快捷键、菜单、顶栏只 dispatch；由所有者 feature 监听并执行。

```ts
window.dispatchEvent(new CustomEvent(EV.X, { detail }))
```

| 事件 | detail | 监听所有者 | 说明 |
| --- | --- | --- | --- |
| EV.SELECT_ALL / COPY / CUT / PASTE / DUPLICATE / DELETE | — | canvas | 剪贴板与删除 |
| EV.Z_FRONT / Z_BACK | — | canvas | 置顶/置底 |
| EV.ALIGN (detail: 'left'\|'center'\|'right'\|'top'\|'middle'\|'bottom') / EV.DISTRIBUTE ('h'\|'v') | 见左 | canvas | 对齐与等距分布 |
| EV.AUTO_LAYOUT (detail: 'TB'\|'LR') | 方向 | canvas | 调 plugin.layout 并包成一条命令 |
| EV.FIT / ZOOM_IN / ZOOM_OUT / ZOOM_RESET | — | canvas | 视图 |
| EV.NEW_DOC (detail: {type, templateId?}) / EV.OPEN_DOC (id) / EV.RENAME_DOC / EV.DUPLICATE_DOC / EV.DELETE_DOC | 见左 | home/io | 文档管理 |
| EV.SAVE / EV.EXPORT_JSON / EV.EXPORT_PNG (detail {scale, background, titleblock}) / EV.EXPORT_SVG / EV.EXPORT_MERMAID / EV.IMPORT_JSON / EV.IMPORT_MERMAID | 见左 | io | 保存与导入导出 |
| EV.SET_TOOL (detail: 'select'\|'hand') | — | uiStore 消费方 | V/H 切换工具 |
| EV.SHOW_SHORTCUTS | — | uiStore | 「?」打开快捷键列表 |
| EV.SHARE | — | collab | 右上「分享」弹层里的「开启协作并生成链接」 |
| EV.ADD_SHAPE (detail: {kind}) | 形状 kind | canvas | 形状坞点击：先问 plugin.placeFromPalette，否则放到视口中心（2026-10-21 新增） |
| EV.EDIT_TEXT | — | canvas | 工具条/右键「编辑文字」：选中单节点进入编辑（2026-10-21 新增） |

## 6. 组件契约

> 2026-10-21 UI 改版（见 `docs/REDESIGN.md`）：外壳由「顶栏 + 左右停靠面板」改为「全屏画布 + 四角浮动条 + 左侧形状坞 + 上下文工具条」，检查器能力移入 `features/canvas/toolbar/`；下文「面板」「顶栏」两条为阶段4 原始契约，现行布局以 REDESIGN.md §4.3 为准。拖放约定、空画布提示归属、右键菜单规则不变。

- `features/canvas/EditorCanvas.tsx`：默认导出 `<EditorCanvas />`，无 props；内部接 React Flow。
- `src/App.tsx`（外壳）：`route === 'editor'` 渲染编辑器骨架（阶段4：顶栏 + 左右面板 + `<EditorCanvas/>`；改版后：`<EditorCanvas/>` + 浮动条），`'home'` 渲染 `<HomePage/>`（阶段6 提供；阶段4 时 route 恒为 'editor'，不渲染任何占位文案）。
- 面板：左侧 240px 形状库、右侧 280px 检查器、顶栏 48px，均为贴边停靠、1px 分隔线、无阴影、可折叠；窗口宽 <1024 渲染「请使用更宽的窗口」整屏提示。
- 右键菜单项由当前 selection 决定，菜单文案/行为由外壳统一发 EDITOR_EVENTS，不直接改文档。
- 形状库拖放约定（阶段4 提供 drag source，阶段3 实现 canvas drop）：`dataTransfer.setData('application/x-diagram-shape', kind)`；canvas 在 onDrop 里读 kind，经 `getPlugin(doc.type)` 找 ShapeDef 建节点，是一条命令。
- 空画布提示层归画布（features/canvas/EmptyState.tsx）：doc 无节点时覆盖画布显示 SPEC §6 规定文案与三个模板入口（模板入口发 EV.NEW_DOC，阶段6 前落到一个「从模板新建」的默认行为上也能工作）。
- 顶栏「分享」按钮由阶段4 放置并 dispatch EV.SHARE；阶段7 决定接协作对话框或按 SPEC 规则移除。

## 7. 命令与历史契约（src/core/commands/）

- `Command = { label: string; coalesceKey?: string; apply(draft: DiagramDoc): void }`。
- documentStore.execute：`produceWithPatches` 得到 patches/inversePatches 入栈；coalesceKey 相同且与上条间隔 <600ms 时合并（label 保留首条）；栈上限 200；undo/redo 用逆/正补丁回放并同步 canUndo/canRedo/undoLabel/redoLabel。
- 拖动、缩放、框选期间只动 React Flow 内部态，松手才 execute 一条命令。
- 自动布局、粘贴、导入、远端协作写入的规则见 SPEC §4/§7。

## 8. 共用文件追加规则（阶段3、4 并行期必须遵守）

- `src/i18n/zh.ts`：只允许在自己命名空间小节追加（canvas.* 归阶段3，topbar.*/palette.*/inspector.*/menus.*/shortcuts.*/home.* 归阶段4）；编辑前重新读取文件，禁止整文件重写。
- `PROGRESS.md`：只在自己阶段的小节下追加行。
- `docs/DECISIONS.md`：追加不改动他人条目。
- 除上述文件与 §1 表列出的自留地外，不得碰对方目录；确需对方改接口，写进 PROGRESS.md「待协调」并继续用契约内的现有接口。

## 9. 提交与质量门（每阶段）

- `pnpm lint` `pnpm typecheck` `pnpm test` `pnpm build` 全过、零警告；浏览器控制台零 error/warning（有 e2e/截图时检查）。
- Conventional Commits 小步提交；更新 PROGRESS.md 自己阶段小节；决策写 DECISIONS.md。
- 不留 TODO/占位/假数据；未完成的功能不显示，并写进已知限制。

## 10. 速查：冻结接口清单

- `DiagramDoc/DiagramNode/DiagramEdge/ErField` — src/core/model/types.ts
- zod schemas — src/core/model/schema.ts
- `Command`、`History` 行为 — src/core/commands/
- `DocumentStore`/`UiStore`/`selectors` — src/store/
- `DiagramPlugin`/`ShapeDef`/`getPlugin`/能力位与钩子 — src/core/plugin.ts、src/plugins/registry.ts
- `EV.*` 事件名 — src/core/events.ts
- `<EditorCanvas/>`、`<HomePage/>` — features/canvas、features/home

## §8 协作挂接（阶段7 已实现，供画布/外壳调用）
- `useCollabStore`（src/store/collabStore.ts）：`status/room/peers/join(room?)/leave()/share()/initFromUrl()/pushCursor(pos|null)`。
- EditorPage 挂载时调用 `initFromUrl()`（识别 `?room=` 自动加入）；EV.SHARE → `share()` 拿链接 → `navigator.clipboard.writeText` + toast「链接已复制」。
- 画布 `onPointerMove` → `pushCursor(screenToFlowPosition({x,y}))`（内部已节流 50ms）；peers 渲染成彩色光标+昵称角标。
- 远端文档经 `setDoc(doc,{resetHistory:false,remote:true})` 合入，不进本地历史、不回播；本地 execute/undo/redo 自动广播。
- 服务器：`pnpm dev:collab` → ws://127.0.0.1:1234（`VITE_COLLAB_WS` 可覆盖）。

## §9 持久化与导入导出（阶段6 已实现，供外壳调用）
- `src/core/io/persist.ts`：listDocs/loadDoc/saveDoc/deleteDoc/renameDoc/duplicateDoc/newDoc（localStorage `ds.docs.v1` + `ds.docIndex.v1`）。
- `src/core/io/importer.ts`：importJsonText / importMermaidText（自动 dagre 摆位，返回 {ok,doc,errors,skipped}）。
- `src/io/export.ts`：exportJsonFile / exportMermaidFile / exportPngFile / exportSvgFile（element=画布容器；PNG 背景按主题；SVG 可带 frame 标题栏）。
- 编辑器进入/变更时应 saveDoc(doc)（建议 debounce 500ms）；首页用 listDocs 渲染列表。
