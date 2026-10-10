# DiagramStudio

纯前端、可离线的在线图表编辑器：一套「命令化 + 插件化」引擎同时支持**流程图、思维导图、ER 图**。软件工程课程大作业。

![首页](docs/screenshots/home.png)
![编辑器](docs/screenshots/editor-flowchart.png)

## 功能特性

- **三种图共用一套引擎**：画布、检查器、撤销、导入导出不区分图类型，差异收敛进 `DiagramPlugin` 插件
- **画布**：方格纸（细格 24px / 每 5 格粗线）、吸附、对齐参考线、小地图、10%–400% 缩放
- **编辑**：单选/多选/框选、八方向缩放、对齐与等距分布、复制粘贴（保内部连线）、置顶置底
- **连线**：四连接点拖拽、落空弹形状菜单自动连好、直线/折线/曲线、箭头、虚线、标签、重连
- **撤销重做**：immer 正/逆补丁历史（200 条上限、600ms 合并窗口），撤销提示显示操作名
- **流程图**：9 类 SVG 形状（起止/处理/判断/输入输出/子流程/数据库/文档/连接符/便签）+ Mermaid 子集导入导出
- **思维导图**：Tab 加子主题、Enter 加同级、圆点折叠、左右交替自动布局、拖放改父级
- **ER 图**：表格式实体（字段行内增删改、PK/FK）、连线两端基数（1、0..1、N、0..N）
- **自动布局**：dagre（流程/ER）、d3-hierarchy（思维导图），一条命令可撤销，300ms 过渡
- **导入导出**：JSON（zod 校验中文报错）、PNG（1x/2x/3x）、SVG、可选工程制图「图框与标题栏」
- **协作（可选）**：`pnpm dev:collab` + `?room=` 链接即房间，yjs CRDT 同步、协作者光标
- **工程素质**：TS strict、core 层 ESLint 强制无 UI 依赖、96 个单测（core 行覆盖 98%）、SPEC §8 全 8 场景 e2e、明暗双主题、全键盘可达

## 技术栈

React 18 · TypeScript strict · Vite · @xyflow/react (React Flow v12) · Zustand + immer · Tailwind CSS v3 + CSS 变量 · Radix UI primitives · @dagrejs/dagre · d3-hierarchy · html-to-image · zod · yjs / y-websocket · Vitest · Playwright · ESLint + Prettier

## 快速开始

要求：Node ≥ 20、pnpm 10（`corepack enable` 可自动对齐 `pnpm@10.34.6`）。

```bash
pnpm install        # 安装依赖（装完即完全离线可用，无 CDN/远程资源）
pnpm dev            # 启动 → http://localhost:5173
pnpm dev:collab     # 需要协作时：同时起协作服务 ws://127.0.0.1:1234
```

协作用法：点顶栏「分享」复制 `?room=` 链接，同伴打开即进房，互见光标与改动。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | Vite 开发服务（:5173） |
| `pnpm dev:collab` | 协作服务（:1234）+ 前端 |
| `pnpm collab:server` | 仅协作服务（:1234，e2e 协作用例用） |
| `pnpm build` | `tsc -b` + `vite build` → `dist/` |
| `pnpm build:e2e` | e2e 模式构建 → `dist-e2e/`（性能/无障碍用例预览源，含调试钩子） |
| `pnpm preview` | 预览构建产物 |
| `pnpm test` | Vitest 单测（jsdom） |
| `pnpm test:coverage` | 单测 + core 覆盖率（阈值 80%） |
| `pnpm e2e` | Playwright 端到端（1440/1280 双视口） |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint / tsc -b / Prettier |

## 目录结构

```text
src/
  core/        纯 TypeScript 领域层（禁引 react/zustand/@xyflow）
    model/     DiagramDoc/Node/Edge 类型、工厂、zod schema
    commands/  Command、补丁历史（history）、全部命令工厂（ops）
    layout/    dagre、思维导图左右交替布局
    io/        JSON 序列化、Mermaid、localStorage 持久化、PNG/SVG 导出、图框标题栏
    collab/    CollabAdapter 接口、yjs 实现、文档 diff
    plugin.ts / events.ts / palette.ts
  plugins/     flowchart / mindmap / er 三个插件 + registry + shapekit + base
  store/       documentStore、uiStore、collabStore、selectors（zustand）
  io/          DOM 导出实现（PNG/SVG 合成、rasterize）
  features/    canvas（画布交互）、shell（topbar/palette/inspector/menus/shortcuts/home/docs）
  components/  通用小组件
  i18n/zh.ts   全部界面文案
  styles/tokens.css  亮「描图纸」/暗「蓝图」设计令牌
server/dev.mjs y-websocket 兼容协作服务（内存房间）；dev-all.mjs 一键起 5173+1234
e2e/           Playwright
docs/          规格、实施契约、决策记录与课程文档
```

## 文档

| 文件 | 内容 |
| --- | --- |
| `docs/SPEC.md` | 原始任务书（功能规格、视觉规范、阶段与质量门） |
| `docs/IMPL_CONTRACT.md` | 实施契约（冻结接口、目录所有权、事件表） |
| `docs/DECISIONS.md` | 技术决策记录 |
| `docs/REQUIREMENTS.md` | 需求分析（用例、功能/非功能需求） |
| `docs/ARCHITECTURE.md` | 架构设计（分层、数据流、插件、协作，含 Mermaid 图） |
| `docs/DESIGN_PATTERNS.md` | 设计模式对照文件说明 |
| `docs/TEST_REPORT.md` | 测试报告（用例、覆盖率、质量门、已知缺陷） |
|| `docs/PERFORMANCE.md` | 性能测试报告（500 节点拖拽帧耗时实测） |
| `docs/USER_GUIDE.md` | 用户手册（操作、快捷键、FAQ） |
| `docs/DEMO_SCRIPT.md` | 课堂演示脚本 |
| `docs/DEFENSE.md` | 答辩手册（选型、链路、20+ 问答、局限） |

## 已知限制

协作房间存内存、无鉴权，定位同机/内网演示；Mermaid 仅为子集；窗口 <1024px 显示整屏提示不做移动端。完整清单见 `docs/TEST_REPORT.md` §7 与 `docs/DEFENSE.md` §10。
