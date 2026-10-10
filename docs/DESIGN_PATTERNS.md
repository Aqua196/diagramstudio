# DiagramStudio 设计模式

> 本文档对应课程交付物清单第 3 项。每个模式说明「用到什么、在哪、为什么」，并给出真实文件路径与关键类型名。

## 目录

- [1. 命令模式 Command —— 文档修改与撤销历史](#1-命令模式-command文档修改与撤销历史)
- [2. 策略/插件模式 Strategy & Plugin —— 三种图共享引擎](#2-策略插件模式-strategy--plugin三种图共享引擎)
- [3. 工厂模式 Factory —— 模型创建收口](#3-工厂模式-factory模型创建收口)
- [4. 观察者模式 Observer —— store 订阅与 yjs observe](#4-观察者模式-observerstore-订阅与-yjs-observe)
- [5. 适配器模式 Adapter —— CollabAdapter](#5-适配器模式-adaptercollabadapter)
- [6. 快照/备忘录模式 Snapshot & Memento —— immer 补丁历史](#6-快照备忘录模式-snapshot--mementoimmer-补丁历史)
- [7. 组合模式 Composite —— 节点/文档/思维导图树](#7-组合模式-composite节点文档思维导图树)
- [8. 数据传输对象 DTO —— 序列化与持久化](#8-数据传输对象-dto序列化与持久化)
- [9. 模式总览速查](#9-模式总览速查)

## 1. 命令模式 Command——文档修改与撤销历史

**用到什么**：`Command = { label; coalesceKey?; apply(draft: DiagramDoc): void }`。

**在哪**：

- 契约 `src/core/commands/command.ts`（`interface Command`）
- 执行器 `src/core/commands/history.ts`（`executeCommand/undoCommand/redoCommand`）
- 命令工厂 `src/core/commands/ops.ts`（`addNode/addEdge/deleteElements/moveNodesBy/setNodePositions/resizeNode/updateNodeText/patchNode/patchNodeStyle/patchEdge/reconnectEdge/bringToFront/sendToBack/alignNodes/distributeNodes/insertElements/setDocTitle/setSettings`）
- 调用入口 `src/store/documentStore.ts`（`execute/undo/redo`）

**为什么**：把「改文档」抽象成对象，每个命令自带语义化 `label`（撤销提示「撤销：移动 3 个元素」）与可回放的补丁；拖动这类高频交互只在松手时构造一条命令，`coalesceKey` + 600ms 窗口把连续打字合并为一条历史。SPEC §3.3 强制「组件里不得直接改文档」，命令模式是这个约束的落地形式——所有写路径汇成一条，可审计、可回放、可测试。

## 2. 策略/插件模式 Strategy & Plugin——三种图共享引擎

**用到什么**：`DiagramPlugin` 接口把「图类型差异」变成可替换的策略对象：`shapes`、`edgeDefaults`、`layout(doc,opts)`、`keymap?`、`onDropOnNode?`、`autoLayoutOnChange?`、`hiddenNodeIds?`、`expandDeletion?`、`edgeFields?`、`templates`。其中 `expandDeletion(doc, nodeIds)` 让插件声明「删这些节点时还应连带哪些 id」（思维导图=整棵子树），画布的删除/剪切路径统一调用它；配合 `Command.mergeWithPrevious` 与 `documentStore.lastChange`，「加子主题+自动重排」可合并为一条历史（一次撤销同时回退两者）。

**在哪**：

- 接口 `src/core/plugin.ts`（`DiagramPlugin`、`ShapeDef<R>`、`ShapeRenderContext`、`EditorContext`）
- 注册表 `src/plugins/registry.ts`（`registerPlugin/getPlugin/getAllPlugins`，预置 `basePlugin` 后被完整实现覆盖）
- 三个策略实现 `src/plugins/flowchart.tsx`、`mindmap.tsx`、`er.tsx`，共享渲染件 `src/plugins/shapekit.tsx`

**为什么**：SPEC §4 要求「画布、检查器、历史、导入导出里不得出现 `type === 'mindmap'` 分支」。例如：检查器渲染 ER 基数下拉时查的是 `plugin.edgeFields === 'cardinality'`；思维导图的自动重排靠 `autoLayoutOnChange: true`；折叠子树靠 `hiddenNodeIds(doc)`。新增一种图类型 = 写一个插件并注册，引擎零改动（开闭原则）。

## 3. 工厂模式 Factory——模型创建收口

**用到什么**：`createDoc/createNode/createEdge/createId` 集中生成带默认值的对象，避免各处手写缺字段。

**在哪**：`src/core/model/factories.ts`（`createId` 用 `crypto.randomUUID()`；`DEFAULT_NODE_STYLE` 统一默认样式）。使用方遍布 `ops.ts`（剪贴板克隆 `cloneForPaste`）、`mermaid.ts`（解析建节点）、`persist.ts`（`newDoc`）、各插件模板。

**为什么**：`DiagramDoc/DiagramNode/DiagramEdge` 的必填字段多（schemaVersion、zOrder、settings、style），工厂保证不变量成立——例如 `createDoc` 必给 `settings.layoutDirection`，`createEdge` 默认 `arrowEnd: 'arrow'`、`routing: 'bezier'`；zod schema 与工厂一一对应，导入校验只走 schema。

## 4. 观察者模式 Observer——store 订阅与 yjs observe

**用到什么**：发布-订阅在系统里出现三次，分别服务不同目的：

**在哪**：

- **zustand 选择器订阅** `src/store/*.ts`：组件 `useDocumentStore(s => s.doc)` 只订阅需要的切片，文档变化时按选择器粒度重渲染（SPEC §3.4 禁取整个 store）。
- **yjs observe** `src/core/collab/yjs.ts`：`nodes.observeDeep/edges.observeDeep/meta.observeDeep` 监听远端增量，`applyingRemote` 标志防止本地回填再触发广播的回声循环；`awareness.on('update')` 推送在线成员/光标。
- **DOM CustomEvent** `src/core/events.ts`：`EV.*` 常量（`ds:align`、`ds:auto-layout`…），快捷键/菜单只 `emit`，所有者 feature 监听执行——发布订阅解耦「触发方」与「执行方」，见 ARCHITECTURE §9。

**为什么**：三种订阅对应三种边界（React 渲染、远端文档、模块解耦），都遵循「观察者可增删、被观察者无感知」。

## 5. 适配器模式 Adapter——CollabAdapter

**用到什么**：把 yjs/y-websocket 的第三方 API 适配成本系统需要的窄接口 `CollabAdapter`。

**在哪**：

- 接口 `src/core/collab/adapter.ts`（`join/pushLocal/pushCursor/leave` + `CollabCallbacks`：onRemoteDoc/onPeers/onStatus）
- 实现 `src/core/collab/yjs.ts`（`YjsCollabAdapter`）：内部管理 `Y.Doc`、`WebsocketProvider`、awareness，把 yjs 的 observe 回调翻译为 `onRemoteDoc(doc)`；`pushLocal` 内部先做 `computeDocDiff` 再 `ydoc.transact` 写入。
- 消费方 `src/store/collabStore.ts` 只面向接口。

**为什么**：SPEC §7 要求协作「通过 CollabAdapter 接口接入，不得污染其他模块；协作关闭或失败时产品必须完全正常」。适配器把协议细节（SyncStep、awareness 编码、origin 标记）关在 `collab/` 目录内——换协议（如 WebRTC）只换 `createCollabAdapter()` 的实现。

## 6. 快照/备忘录模式 Snapshot & Memento——immer 补丁历史

**用到什么**：不存整份快照，存**结构共享的不可变文档 + 正/逆补丁**——这是备忘录模式的高效变体。

**在哪**：

- `src/core/commands/history.ts`：`produceWithPatches` 得 `patches/inversePatches` 入栈（`HistoryEntry`），`undoCommand` 用 `applyPatches(doc, inversePatches)` 回放，`redoCommand` 回放 `patches`；`HistoryState = { past, future }`。
- `src/store/documentStore.ts`：持有 `doc + history`，`setDoc` 供载入/导入/远端写入（可不进历史）。

**为什么**：DiagramDoc 可能有上千元素，整份快照内存开销大；immer 补丁只记录变化路径（如 `nodes.n3.position.x`），体积小且天然支持合并（coalesce 把多条补丁拼成一条历史）与精确回放（逆补丁前插保证按发生顺序倒序还原）。immer 的结构共享让旧 doc 与新 doc 复用未改子树，`r.doc === doc` 的引用比较还能探测「无实质改动」。

## 7. 组合模式 Composite——节点/文档/思维导图树

**用到什么**：部分-整体在两层出现：

**在哪**：

- **文档聚合**：`DiagramDoc` 以 `Record<id, DiagramNode>`/`Record<id, DiagramEdge>` 组合任意数量元素，`zOrder` 管叠放次序——对客户端（检查器、导出、布局）呈现统一的「文档」整体接口。
- **思维导图树**：`DiagramNode.data.parentId` 把平面节点组织成树，`src/core/layout/mindmap.ts` 的 `subtree()/childrenOf()/collapsedDescendants()` 递归遍历子树；折叠节点把整棵后代子树当作一个单元隐藏（`hiddenNodeIds`），删除子树（Delete）也是对子树的整体操作。

**为什么**：树形结构与通用图结构用同一套 `DiagramNode` 承载，差异只在 `data` 语义——组合模式让「树」成为图的特例而不是另一套模型。

## 8. 数据传输对象 DTO——序列化与持久化

**用到什么**：`DiagramDoc` 本身就是无方法纯数据对象（POJO），序列化/校验/持久化/协作传输都围绕这份 DTO。

**在哪**：

- 序列化 `src/core/io/serialize.ts`：`docToJson(doc)` / `jsonToDoc(text)`。
- 校验 `src/core/model/schema.ts`：`docSchema`（zod）+ `semanticCheck`（引用完整性），错误经 `describeIssue` 翻成中文。
- 持久化 `src/core/io/persist.ts`：`ds.docs.v1` 存 JSON 正文、`ds.docIndex.v1` 存 `DocMeta` 索引（id/title/type/updatedAt/nodeCount/edgeCount——列表页只读索引不读全文，是典型的轻量 DTO）。
- 协作传输 `src/core/collab/yjs.ts`：`readDoc` 从 Y.Map 重建 DTO；`computeDocDiff`（diff.ts）产出 `DocDiff{setNodes,delNodes,setEdges,delEdges,metaChanged}`——差异本身也是一个 DTO。

**为什么**：DTO 与行为分离让「同一份数据」可以被磁盘（JSON）、网络（Yjs）、校验器（zod）三种通道复用；`DocMeta` 索引让首页列表的开销与文档大小解耦。

## 9. 模式总览速查

| 模式 | 关键类型/函数 | 文件 |
| --- | --- | --- |
| Command | `Command`、`executeCommand` | `src/core/commands/command.ts`、`history.ts`、`ops.ts` |
| Strategy/Plugin | `DiagramPlugin`、`ShapeDef`、`getPlugin` | `src/core/plugin.ts`、`src/plugins/*.tsx` |
| Factory | `createDoc/createNode/createEdge/createId` | `src/core/model/factories.ts` |
| Observer | zustand 选择器、`observeDeep`、awareness、`EV.*` | `src/store/*`、`src/core/collab/yjs.ts`、`src/core/events.ts` |
| Adapter | `CollabAdapter`、`YjsCollabAdapter` | `src/core/collab/adapter.ts`、`yjs.ts` |
| Snapshot/Memento | `produceWithPatches/applyPatches`、`HistoryEntry` | `src/core/commands/history.ts` |
| Composite | `DiagramDoc` 聚合、`data.parentId` 子树 | `src/core/model/types.ts`、`src/core/layout/mindmap.ts` |
| DTO | `DiagramDoc`、`DocMeta`、`DocDiff` | `src/core/model/types.ts`、`src/core/io/persist.ts`、`src/core/collab/diff.ts` |
