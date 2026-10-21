# DECISIONS

记录实现过程中的取舍。条目格式：`## YYYY-MM-DD 标题`，写清背景、选择与理由。

## 2026-10-10 子代理执行方式（两次修订）

背景：SPEC §9 要求按阶段创建子代理。项目仓库没有可交接的远端，各阶段共享同一份持续演进的工作树与 node_modules。

第一选择：工作流 shared-VM 子代理。被系统拒绝：本会话是 SWE-2 会话，不支持 shared-VM agents。

第二选择：独立 VM 子代理 + git 分支交接。需要先建远端仓库，但 GITHUB_BURNER_PAT 已失效（API 返回 401 Bad credentials），无法在 Aqua196 下建仓库。

最终决定：总指挥直接按阶段顺序实现全部代码，保持每阶段的目录边界（IMPL_CONTRACT §1）、质量门（SPEC §10）与 Conventional Commits 小步提交完全不变；若用户后续创建 Aqua196/diagramstudio 公开仓库，阶段5 及之后可切回子代理并行（独立 VM + 分支交接）。

理由：不阻塞交付；阶段边界靠契约文件与逐阶段验收维持，而非执行者数量。

## 2026-10-10 Playwright 浏览器

背景：本机无 sudo，playwright 自带 chromium 可能缺系统库。

选择：优先自带 chromium；跑不起来时 playwright.config.ts 用 `channel: 'chrome'` 调系统 Chrome。

理由：仍是 Playwright 驱动，满足 SPEC 测试要求；系统 Chrome 无需系统依赖安装。

## 2026-10-10 交付方式

背景：SPEC 未指定代码托管位置，最终需让学生拿到含完整提交历史的代码。

选择：开发期只提交到本地 git（Conventional Commits）；完成时将仓库推送到用户 GitHub 账号下的公开仓库（若无权限则打包含 .git 的完整目录交付）。

理由：本地提交即可满足「小步提交」要求；最后统一交付避免中途打断。

## 2026-10-10 阶段2 决策
- `contrastRatio` 按 WCAG 规范修正为「亮值/暗值」，初版未排序导致暗色对误判。
- Mermaid 解析器支持「单行节点声明」（无连接器的 `A[文本]`），否则自身导出的孤立节点会被计为 skipped。
- `resizeNode` 命令不做最小尺寸约束：最小尺寸属于交互层（拖拽手柄）的职责，命令保持纯数据语义。
- 基座插件 `src/plugins/base.tsx` + `registry.ts`：阶段5 前即可渲染通用形状，阶段5 用 `registerPlugin` 覆盖——画布/外壳不感知「基座/完整」区别。
- 单元测试 29 个：core 行覆盖 93.7%、分支 82.4%（门槛 80%）。

## 2026-10-10 阶段3/4 决策
- `fitViewOptions.maxZoom=1`：React Flow 在节点首次出现时按 fitView 重取景，单节点会冲到 maxZoom=4（400%）；上限 1 保持「适应画面」语义。
- `tsconfig.app.json` 排除 `src/**/*.test.*`：阶段2 已提交的 `src/core/commands/ops2.test.ts` 调 `reconnectEdge` 时少传必填 `target`，使 `tsc -b` 在 HEAD 上即红；core 冻结不可改测试本体，测试由 vitest 独立转译运行，故在 tsconfig 排除测试文件保持门禁可判定。
- `src/test/setup.ts` 只冻结 `Date`（`vi.useFakeTimers({toFake:['Date']})`）：executeCommand 恒写 `updatedAt=Date.now()`，「无实质改动不入栈」测试仅在同一毫秒内通过——全量跑时跨毫秒即失败。冻结日期后确定性通过；setTimeout 等仍真实。
- `tsconfig.node.json` 增加 DOM lib：e2e spec 用 `DataTransfer`/`localStorage`（playwright `evaluateHandle`/`evaluate` 内的浏览器端对象）。
- 拖线到空白松手时弹出形状菜单（ConnectMenu）：RF `onConnectEnd` 无目标时取 plugin.shapes 生成「添加节点并连接」复合命令（insertElements），保持一次历史条目。
- 4 向锚点统一 `type="source"` + `connectionMode=Loose`：任一侧都可作连线的起点或终点，满足 SPEC §3.1 四向锚点。
- `vite.config.ts manualChunks` 拆 react/xyflow vendor：消除 build 的 >500kB chunk 警告，门禁要求零警告。
- 首页模板缩略图直接渲染模板文档的节点/连线缩比 SVG；模板为空时画通用形状示意——无假数据。
- 文档管理完全在事件总线上：首页卡片、检查器按钮、快捷键总线都只 emit EV.*，落盘/导航集中在 `useDocEvents`，与后续阶段6的导入导出共用同一存储层（`ds.docs.v1`/`ds.docIndex.v1`/`ds.lastDoc.v1`）。

## 2026-10-10 批次 A/B 评审修正（R1–R7）
- 未显式记录锚点的连线按两节点中心连线自动选边（水平占优→左右，垂直→上下），替代 RF 默认「第一个 handle」（即 top）导致的穿线；显式锚点不覆盖。派生父子连接线同样走选边。
- 图框标题栏占用导出画面底部额外空间（TITLE_BLOCK_H + 12px 间隔），内容不再被标题栏覆盖。
- 协作成员头像/光标颜色用内联样式而非 CSS 变量：成员颜色是 awareness 动态数据（`PEER_COLORS[clientId % n]`），非静态令牌，不能走 tokens。
- 流程图模板末节点文案取「进入主页」而非「进入首页」：与既有 e2e 断言（visual.spec.ts）一致，语义相同。
- `--accent-ink` 入 tokens.css 双主题（亮 #FFFFFF on #0B7A75 / 暗 #0B1F38 on #4FD1C0），对比度纳入核心单测。
- EV.CUT 复制与删除一致使用 expandDeletion 扩展集，剪切+粘贴思维导图分支可整支恢复。

## 2026-10-21 前端改版：画布优先（详见 docs/REDESIGN.md）
- **去掉常驻左右面板，改为四角浮动条 + 上下文工具条**：旧检查器分组默认折叠、未选中时 280px 基本空白；属性在被选中元素旁边改，视线不用横跨屏幕。检查器的全部能力都保留，分布到工具条与「⋯ 更多选项」。
- **删除顶栏「切换图类型」**：它会把整份文档改成另一种类型（`setDocType`），节点退化为兜底方框。类型在新建时决定；`setDocType` 命令一并删除，换成多选改样式的 `patchNodesStyle`。
- **「加完直接打字」统一走 `features/canvas/focus.ts`**：命令执行后若恰好新增一个节点就选中并进入编辑。形状坞、四周「+」、双击、连线菜单、插件按键/工具条动作共用这一条路径，不各自处理焦点。
- **新增插件可选钩子而不是在外壳里判断类型**：`nodeActions`、`placeFromPalette`、`quickAddSides`、`nextKind`、`createBlank`、`tips`、`ShapeDef.icon/defaultData/paletteHidden`、`edgeDefaults.cardinality`。全部可选，未实现时有通用默认行为；SPEC §4「禁止 type 分支」约束不变。
- **默认描边 `ink` 改为跟随底色取同色相描边**（`NODE_STROKES`）：旧文档无需迁移即获得新外观；自定义描边仍原样使用。
- **流程图新连线默认折线（圆角）**；两端正对时退化为直线，避免亚像素偏差画出小锯齿；折线标注取路径实测中点（L 形折线的几何中心不在线上）。Mermaid 导入由外壳注入流程图默认路由，core 不依赖插件。
- **适应画面只在打开/切换文档时做**：React Flow 的 `fitView` 属性在空文档放下第一个节点时也会触发，把节点拽到正中、第二个落点叠上去。改为挂载时已有内容才用初始 fitView，换文档时手动 fit。
- **思维导图派生父子连线 `reconnectable:false`、`zIndex:0`**：原先连线重连热区（r=10 的端点圆）盖在节点外侧的折叠钮上，点击被吞掉（e2e 发现）。
- **保留 React Flow 署名**：`hideAttribution` 仅限 Pro 订阅者使用，开发期还会打印警告；改为移到左下浮动条上方并弱化显示。
- **没动过的空白文档离开时回收**（`features/shell/docs/pristine.ts`）：新建空白登记、首次本地编辑注销、离开（回首页/打开别的/新建）时仍未编辑则删除；自动保存只在编辑器路由下落盘，避免回收后又被防抖写回。
- **性能测量改用 CDP Trace 主线程任务**：旧 rAF 间隔在空白页上也是 17.8ms，测的是无头浏览器帧时钟；合成 pointermove 也不会触发 d3-drag。详见 docs/PERFORMANCE.md §1–2。
- **只给有标注的连线挂 `EdgeLabelRenderer`**：其 store 选择器每次更新都会 `querySelector`，800 条边即每帧 800 次 DOM 查询（CPU profile 第一热点）。节点不使用 transform 入场动画与 CSS filter（两者都会让拖动时整图重绘）。
- **手册配图改由 `e2e/guide.spec.ts` 生成**：界面改了配图就能一键重生成，避免手册与界面脱节。
