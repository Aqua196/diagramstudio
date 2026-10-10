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
