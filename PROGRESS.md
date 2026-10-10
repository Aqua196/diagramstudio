# PROGRESS

## 阶段状态

- [x] 阶段0 准备（总指挥）：git 仓库初始化、docs/SPEC.md、docs/IMPL_CONTRACT.md、Node20+pnpm10 环境
- [x] 阶段1 脚手架与规范：lint/typecheck/test/build/e2e 全过零警告；截图 docs/screenshots/stage1-home.png
- [ ] 阶段2 核心层（模型/命令/布局/IO/单元测试）
- [ ] 阶段3 画布（与阶段4并行）
- [ ] 阶段4 界面外壳（与阶段3并行）
- [ ] 阶段5 三种图插件
- [ ] 阶段6 文档管理与导入导出
- [ ] 阶段7 协作
- [ ] 阶段8 质量与打磨
- [ ] 阶段9 课程文档

## 下一步

阶段2：核心层（模型/命令与历史/布局/Mermaid/序列化/store 公共 API + 单元测试）。

## 待协调

（空）

## 阶段2 核心层 ✅ 2026-10-10
- 模型/types/zod schema（引用完整性校验）、immer produceWithPatches 命令历史（合并窗口 600ms、上限 200）
- 全部元素操作命令 + 对齐/分布纯函数、克隆粘贴（内部连线重映射）
- dagre 布局、思维导图左右交替布局（d3-hierarchy + 折叠子树隐藏）
- Mermaid 子集手写解析器 + 导出（往返自洽）、JSON 序列化、图框标题栏 SVG
- 节点配色 7 对 + WCAG 对比度工具（全部 ≥4.5:1 经测试）、协作适配器接口、插件接口（含 hiddenNodeIds/autoLayoutOnChange 钩子）
- zustand 文档/UI store、React Flow 选择器、基座插件 + 注册表
- 门禁：lint/typecheck/build/29 单测全绿，core 覆盖率 93.7% 行

## 阶段7 协作 ✅ 2026-10-10（提前于 UI 完成核心链路）
- server/dev.mjs：y-websocket 兼容 ws 服务（sync+awareness，两客户端互同步已冒烟验证）
- core/collab：adapter 接口 + yjs 实现（Y.Map 存 nodes/edges/meta，diff 事务写入，observeDeep 回填，awareness 光标/昵称/颜色，50ms 节流）
- collabStore：join/leave/share/initFromUrl/pushCursor；documentStore 经 setCollabBroadcast 解耦广播
- 单测 +3（diff）；门禁全绿。UI 接线（分享按钮/peers 光标/房间入口）待阶段4/6 完成。

## 阶段5 插件 ✅ / 阶段6 IO 层 ✅ 2026-10-10
- flowchart：11 种 SVG 形状 + 登录流程模板 + dagre；mindmap：data.parentId 树、Tab/Enter 键位、折叠圆钮（dispatch）、拖放改父级（含防环）、autoLayoutOnChange；er：实体表头+字段行（行内增删改字段 dispatch patchNode）、edgeFields=cardinality、选课系统模板
- persist/importer/export 全套本地 IO；frameSvg 支持嵌入内容；ShapeRenderContext 增加 doc
