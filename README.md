# DiagramStudio

纯前端、可离线的在线图表编辑器：一套「命令化 + 插件化」引擎同时支持**流程图、思维导图、ER 图**。软件工程课程大作业。

**在线试用：<https://aqua196.github.io/diagramstudio/>**（无需安装；作品存在你自己浏览器的本地存储里。实时协作需要本机协作服务，在线版不含）

![首页：三类新建卡与最近的图表](docs/screenshots/guide/01-home.png)
![编辑器：画布铺满全屏，选中节点后出现上下文工具条与四周「+」](docs/screenshots/guide/02-flowchart-template.png)

> 2026-10-21 前端改版为「画布优先」：去掉常驻面板，改为浮动界面 + 上下文工具条 + 上手提示。动机、前后对比与验证见 [`docs/REDESIGN.md`](docs/REDESIGN.md)。

## 功能特性

- **上手零学习成本**：点左侧形状就添加并直接打字；选中节点点四周「+」一键接下一步（已连好线）；双击空白放节点；底部提示条按图类型教操作
- **画布优先的界面**：画布铺满全屏，界面悬浮在四角；属性跟着选中对象出现在它上方（上下文工具条），低频操作收进「更多」
- **三种图共用一套引擎**：画布、工具条、撤销、导入导出不区分图类型，差异收敛进 `DiagramPlugin` 插件（含形状坞图标、工具条动作、快捷添加规则、空白文档、提示文案等可选钩子）
- **画布**：点阵网格、吸附、对齐参考线、小地图（可开关）、10%–400% 缩放
- **编辑**：单选/多选/框选、八方向缩放、对齐与等距分布、多选统一改色、复制粘贴（保内部连线）、置顶置底
- **连线**：四连接点拖拽、落空弹形状菜单自动连好、折线（圆角）/曲线/直线、箭头、虚线、标注、重连
- **撤销重做**：immer 正/逆补丁历史（200 条上限、600ms 合并窗口），撤销提示显示操作名
- **流程图**：10 种 SVG 形状 + Mermaid 子集导入导出
- **思维导图**：空白即带中心主题；Tab 加子主题、Enter 加同级，新主题直接进入打字；分支配色、连线随分支着色；折叠显示子节点数；拖放改层级
- **ER 图**：表格式实体（预置 id 主键、字段行内增删改、PK/FK）、关系默认 1 对 0..N、两端基数鸟脚符号
- **自动整理**：dagre（流程/ER）、d3-hierarchy（思维导图），一条命令可撤销，300ms 过渡
- **导入导出**：一个对话框选 PNG（1x/2x/3x）/ SVG / JSON / Mermaid；可选工程制图「图框与标题栏」；JSON 导入 zod 校验中文报错
- **协作（可选）**：`pnpm dev:collab` 后「分享」一键开启，yjs CRDT 同步、协作者光标、连接状态与在线成员
- **工程素质**：TS strict、core 层 ESLint 强制无 UI 依赖、125 个单测（core 行覆盖 98.8%）、SPEC §8 全场景 e2e（1440/1280 双视口）、axe 零违规、浅/深双主题、全键盘可达

## 技术栈

React 18 · TypeScript strict · Vite · @xyflow/react (React Flow v12) · Zustand + immer · Tailwind CSS v3 + CSS 变量 · Radix UI primitives · @dagrejs/dagre · d3-hierarchy · html-to-image · zod · yjs / y-websocket · Vitest · Playwright · ESLint + Prettier

## 快速开始

要求：Node ≥ 20、pnpm 10（`corepack enable` 可自动对齐 `pnpm@10.34.6`）。

```bash
pnpm install        # 安装依赖（装完即完全离线可用，无 CDN/远程资源）
pnpm dev            # 启动 → http://localhost:5173
pnpm dev:collab     # 需要协作时：同时起协作服务 ws://127.0.0.1:1234
```

协作用法：右上点「分享」→「开启协作并生成链接」，链接自动复制，同伴打开即进房，互见光标与改动。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | Vite 开发服务（:5173） |
| `pnpm dev:collab` | 协作服务（:1234）+ 前端 |
| `pnpm collab:server` | 仅协作服务（:1234，e2e 协作用例用） |
| `pnpm build` | `tsc -b` + `vite build` → `dist/` |
| `pnpm build:e2e` | e2e 模式构建 → `dist-e2e/`（性能/无障碍用例预览源，含调试钩子） |
| `pnpm build:pages` | 按 `/diagramstudio/` 子路径构建 → `dist/`（GitHub Pages 用；推送 main 后由 `.github/workflows/pages.yml` 自动执行并发布） |
| `pnpm preview` | 预览构建产物 |
| `pnpm test` | Vitest 单测（jsdom） |
| `pnpm test:coverage` | 单测 + core 覆盖率（阈值 80%） |
| `pnpm e2e` | Playwright 端到端（1440/1280 双视口；同时重生成 docs/screenshots 下的截图） |
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
  plugins/     flowchart / mindmap / er 三个插件 + registry + shapekit + shapeIcons + base
  store/       documentStore、uiStore、collabStore、selectors（zustand）
  io/          DOM 导出实现（PNG/SVG 合成、rasterize）
  features/
    canvas/    画布交互：节点/连线渲染、快捷加号、拖入/双击/形状坞放置、右键菜单
      toolbar/ 上下文工具条（单选/多选/连线）
    shell/
      editor/  浮动外壳：左上文档、右上分享导出更多、形状坞、缩放条、设置、提示条、导出对话框
      home/    首页：新建卡、最近图表、缩略图
      docs/    文档存储、事件、IO、空白文档回收
      shortcuts/ toasts/  快捷键总线与面板、提示条
  components/  通用小组件（Tip、IconButton、Switch、NumberField、BrandMark）
  i18n/zh.ts   全部界面文案
  styles/      tokens.css 设计令牌（浅/深）+ base.css 界面基元
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
| `docs/PERFORMANCE.md` | 性能测试报告（500 节点真实拖拽、主线程任务耗时、改版前后对比） |
| `docs/REDESIGN.md` | 前端改版说明（问题清单、设计原则、前后截图对比） |
| `docs/MOTION.md` | 动效设计与实现（画布动效引擎、页面转场、减少动态效果、验证方法） |
| `docs/USER_GUIDE.md` | 用户手册（操作、快捷键、FAQ） |
| `docs/DEMO_SCRIPT.md` | 课堂演示脚本 |
| `docs/DEFENSE.md` | 答辩手册（选型、链路、20+ 问答、局限） |

## 已知限制

协作房间存内存、无鉴权，定位同机/内网演示；Mermaid 仅为子集；窗口 <1024px 显示整屏提示不做移动端。完整清单见 `docs/TEST_REPORT.md` §7 与 `docs/DEFENSE.md` §10。
