# 任务：构建「DiagramStudio」在线图表编辑器

给 Devin（swe-2）的任务提示词。整段作为第一条消息发送，之后不需要再补充。

## 0. 目标与交付标准

你要独立交付一个可直接演示的完整网页应用：在线图表编辑器，支持流程图、思维导图、ER 图。这是软件工程课的个人大作业，要现场演示并答辩。

- 前端是评分重点：交互流畅、视觉精致，不是骨架或原型。
- 我不熟悉前端，答辩要靠你写的文档讲清代码，所以结构要清晰，文档要与代码一致。
- 过程中不要向我提问。遇到歧义，选最合理的方案，记到 docs/DECISIONS.md 后继续。

## 1. 工作方式

1. 你是总指挥。不要自己一口气写完，按第 9 节为每个阶段创建子代理，一次只给一个边界清楚的任务，并写明：目标、可修改的目录、验收标准、禁止事项。
2. 有依赖的阶段按顺序做；互不依赖的可以并行，但并行的子代理必须修改不同目录。
3. 子代理交付时必须汇报：改了哪些文件、跑了哪些命令、结果、已知问题。你不能只信汇报，要自己重新运行 lint、typecheck、test、build 验证。
4. 每个阶段结束都要过质量门（第 10 节），不通过就修，修好再进入下一阶段。
5. 视觉验收：每阶段结束，用 Playwright 在 1440×900 和 1280×720 截图关键界面，自己看图，修掉错位、溢出、对比度不足、字体错误。
6. 小步提交，使用 Conventional Commits。根目录维护 PROGRESS.md（各阶段状态与下一步），docs/DECISIONS.md 记录取舍。
7. 增量修改，不要整体重写已能工作的代码。
8. 不留 TODO、占位按钮、假数据、「即将推出」。没做完的功能直接不显示，并写进已知限制。
9. 严格遵守第 2、3 节。想引入清单外的依赖，先在 DECISIONS.md 写明理由。

## 2. 技术栈（固定）

- Node 20 + pnpm；Vite + React 18 + TypeScript（strict）
- 画布：@xyflow/react（React Flow v12）
- 状态：Zustand + immer（用 produceWithPatches 实现撤销重做）
- 样式：Tailwind CSS v3 + CSS 变量；图标 lucide-react；弹出层等无障碍基础用 Radix UI primitives（dropdown-menu、context-menu、popover、tooltip、dialog）
- 布局：@dagrejs/dagre（流程图、ER）、d3-hierarchy（思维导图）
- 导出：html-to-image；校验：zod
- 字体：@fontsource/barlow、@fontsource/barlow-semi-condensed，本地打包；中文用系统字体 PingFang SC、Microsoft YaHei、Noto Sans SC 回退
- 测试：Vitest、@testing-library/react、Playwright、@axe-core/playwright
- 协作（第 7 阶段）：yjs、y-websocket，加一个很小的 Node 服务放在 server/
- 质量：ESLint（typescript-eslint）、Prettier
- 禁止：antd、MUI 等 UI 组件库，Redux，CSS-in-JS，任何运行时 CDN

## 3. 前端硬性约束

1. TypeScript strict；禁用 any 和 @ts-ignore（确需绕过用 @ts-expect-error 并写明原因）。
2. src/core 不得引入 react、zustand、@xyflow（用 ESLint no-restricted-imports 强制），保证可单元测试。
3. 文档只能通过 history.execute(command) 修改，组件里不得直接改文档。拖动、缩放、框选等过程态放在 uiStore 或 React Flow 内部，松手时才提交一条命令。
4. Zustand 一律用选择器订阅，禁止取整个 store；自定义节点和连线必须 React.memo；nodeTypes、edgeTypes 在模块级定义。
5. 样式只用 Tailwind 类和 tokens.css 变量，组件里不硬编码颜色、阴影、圆角（节点配色常量只放 core/palette.ts）；inline style 只用于动态几何。
6. 组件文件不超过 200 行，函数不超过 50 行，一个文件一个职责。
7. 界面文字全部放在 src/i18n/zh.ts，组件里不写文案字面量。
8. 可访问性：所有交互元素可键盘聚焦、有可见焦点环、有中文 aria-label；文字对比度不低于 4.5:1。
9. 浏览器控制台零 error、零 warning。
10. 安装依赖后可完全离线运行：无 CDN、无远程字体、无远程图片。
11. 关键设计处写简短中文注释，说明为什么这样做，而不是复述代码做了什么。
12. 不得为了让测试通过而削弱或删除断言。

## 4. 架构

```
src/
  core/        纯 TypeScript，不依赖 React
    model/     类型、工厂、zod schema
    commands/  Command、History、各具体命令
    layout/    dagre 与思维导图布局
    io/        序列化、Mermaid、PNG/SVG 导出
    palette.ts 节点配色常量（明暗两套）
    collab/    协作适配器
  plugins/     flowchart、mindmap、er 三个图类型插件
  store/       documentStore、uiStore、collabStore
  features/    canvas、topbar、palette、inspector、menus、shortcuts、home
  components/  通用小组件
  i18n/zh.ts
  styles/tokens.css
server/        协作服务
docs/  e2e/
```

数据模型（集合都用 id 为键的 Record，方便生成补丁并映射到 Yjs）：

```ts
type DiagramType = 'flowchart' | 'mindmap' | 'er'
interface DiagramDoc {
  schemaVersion: 1
  id: string; title: string; type: DiagramType
  nodes: Record<string, DiagramNode>
  edges: Record<string, DiagramEdge>
  zOrder: string[]   // 节点叠放顺序，后者在上
  settings: { grid: boolean; snap: boolean }
  createdAt: number; updatedAt: number
}
```

- DiagramNode：id、kind、position、size、text、style（fill、stroke、strokeWidth、dash、fontSize、bold、align）、data（思维导图：parentId、collapsed；ER：fields\[\]）
- DiagramEdge：id、source、target、sourceHandle、targetHandle、routing（bezier、step、straight）、arrowStart、arrowEnd、label、style、cardinality（仅 ER）
- React Flow 用的 nodes、edges 由文档经选择器派生，不单独保存。

命令与历史（命令模式）：

- 文档的任何修改都通过 history.execute(command)。命令带 label（如「移动 3 个元素」）和 apply(draft)，内部用 produceWithPatches 取得补丁与逆补丁并入栈。
- 连续操作合并为一条历史：相同 coalesceKey 且间隔小于 600ms 则合并；拖动只在松手时提交。
- 撤销按钮的提示显示「撤销：移动 3 个元素」。历史上限 200 条。
- 自动布局、粘贴、导入各自是一条命令。

插件接口（策略模式，三种图共用同一套引擎）：

```ts
interface DiagramPlugin {
  type: DiagramType
  shapes: ShapeDef[]   // 形状库内容与节点渲染
  edgeDefaults: EdgeStyle
  layout(doc: DiagramDoc, opts: LayoutOptions): Record<string, { x: number; y: number }>
  keymap?: Record<string, (ctx: EditorContext) => Command | null>  // 如思维导图的 Tab、Enter
  templates: DiagramDoc[]
}
```

画布、检查器、历史、导入导出里不得出现 type === 'mindmap' 这类分支，差异只能放进插件。

## 5. 功能规格

每一项都必须真实可用。

**画布**

- 平移：空格加拖动、中键拖动、触控板双指；缩放：Ctrl/Cmd+滚轮、按钮、适应画面，范围 10% 到 400%
- 方格纸背景：细格 24px，每 5 格一条粗线，可开关；吸附网格（默认开，步长 12px）
- 拖动时显示对齐参考线，并吸附到其他节点的边缘和中心
- 小地图（可开关）

**选择与编辑**

- 单击、Shift 多选、框选；移动；八个方向缩放（有最小尺寸）；方向键微调 1px，Shift 加方向键 10px
- 双击或 Enter 编辑文字，Shift+Enter 换行，Esc 取消，点空白处提交
- 复制、剪切、粘贴（保留所选节点之间的连线，偏移 24px）、创建副本、删除
- 置于顶层、置于底层；对齐（左、中、右、上、中、下）；横向与纵向等距分布
- 右键菜单随选中对象变化

**连线**

- 悬停节点出现四个连接点，拖出即连；拖到空白处松手，弹出形状菜单并自动连好
- 直线、折线、曲线；起止箭头可选；虚线；颜色；双击加标签；拖动端点可重连

**流程图**：起止、处理、判断、输入输出、子流程、数据库、文档、连接符、便签，共 9 种形状，全部用 SVG 绘制。

**思维导图**：中心主题；Tab 加子节点，Enter 加同级，Delete 删除子树，点击圆点折叠或展开；每次变动自动布局（左右展开）；不同分支自动使用不同颜色；拖动节点到另一节点上可改父级。

**ER 图**：实体节点是表格样式，列出字段（名称、类型、主键、外键），可行内增删改字段并拖动排序；关系连线两端可选基数（1、0..1、N、0..N）并绘制为鸟脚符号，做不到鸟脚就用文字标注。

**自动布局**：工具栏一键触发，方向可选（上下或左右）；300ms 过渡动画；是一条命令，可撤销。

**文档管理与导入导出**

- 首页：文档卡片网格（缩略图由模型直接画成小 SVG）；新建、重命名、创建副本、删除（带确认）
- 新建可选空白或模板。三个有真实内容的模板：「用户登录流程」（流程图）、「软件工程知识点」（思维导图）、「图书管理系统」（ER 图）
- 自动保存到 localStorage（防抖 500ms），顶栏显示「已自动保存 14:32」；Ctrl/Cmd+S 立即保存
- 导出 JSON；导入 JSON（用 zod 校验，错误要给出具体的中文原因）
- 导出 PNG（1x、2x、3x；白底、透明或带方格纸）和 SVG
- 导出可选「图框与标题栏」：给图加边框，右下角放工程制图风格的标题栏，包含图名、作者、日期、版本。这是产品的特色细节，认真做。
- 流程图支持 Mermaid 子集的导入与导出：graph TD/LR；节点 A\[矩形\]、A(圆角)、A{判断}、A(\[起止\])、A\[(数据库)\]、A\[/输入输出/\]；连线 -->、---、-.->、==>；标签 -->|文字|；支持链式 A --> B --> C。手写解析器，遇到不认识的行就跳过，并告诉用户跳过了几行。

**快捷键**：V 选择、H 抓手、Ctrl/Cmd+A 全选、C、X、V、D（副本）、Z、Shift+Z 或 Y、Delete、\[ 和 \] 调整叠放、Ctrl/Cmd+0 适应画面、Ctrl/Cmd+加减缩放、Shift+L 自动布局、? 打开快捷键列表、Esc 取消选择。Mac 上 Ctrl 对应 Cmd。

**性能**：500 个节点加 800 条连线时，拖动平均每帧小于 20ms。用 onlyRenderVisibleElements、React.memo、选择器订阅达成；用 Playwright 测量，真实数据写入 docs/PERFORMANCE.md，达不到就如实记录。

## 6. 视觉与交互规范

**设计理念：制图室。** 产品像一张绘图图板：方格纸画布、针管笔线条、CAD 风格的方形夹点。安静、精确、有工具感，不做装饰。只在一处放大胆：方格纸画布，以及导出时的图框与标题栏。其余保持克制。

**布局（桌面优先，最小 1280×720）**

- 顶栏 48px：左侧产品名与可编辑的文档名；中间是图类型分段控件、撤销、重做、缩放比例、自动布局；右侧是导出、分享（协作）、主题切换
- 左侧形状库 240px，右侧检查器 280px，都是贴边停靠面板，1px 分隔线，无阴影，可折叠；画布占满中间
- 检查器随选中内容切换：未选中显示画布设置（网格、吸附、小地图）；选中节点显示文字、填充、线条、尺寸与位置；选中连线显示路由、箭头、虚线、颜色；多选显示对齐与分布
- 窗口宽度小于 1024 时显示「请使用更宽的窗口」，不渲染错乱的界面

**设计令牌**（写入 tokens.css，组件只能引用变量）

亮色「描图纸」：

- --sheet #F1F4F6（画布）、--panel #FAFBFC、--panel-sunken #EDF0F3、--line #D9DEE4
- --ink #1B2430、--ink-2 #4B5664、--ink-3 #6B7684
- --accent #0B7A75（选中、焦点、主按钮）、--accent-wash rgba(11,122,117,.10)、--danger #B42318
- 方格：细线 rgba(27,36,48,.06)，粗线 rgba(27,36,48,.12)

暗色「蓝图」，不是普通深灰，而是晒图蓝：

- --sheet #0E2745、--panel #0B1F38、--panel-sunken #0F2A4A、--line #214A75
- --ink #E6EEF7、--ink-2 #B4C6DA、--ink-3 #8CA5C0、--accent #4FD1C0
- 方格：细线 #1B3F66，粗线 #285585

默认跟随系统，也可手动切换并记住选择。

**节点配色**（core/palette.ts，每色一对「亮 / 暗」）：白 #FFFFFF / #163A63；描图灰 #E9EDEF / #1E4572；青 #D3EDE8 / #1B5560；蓝 #D5E2F5 / #25518A；荧光黄 #F7E7A1 / #6B5E22；粉 #F6D5D5 / #6B3340；紫 #E1DAF3 / #43386B。默认线条用 --ink，1.5px。写一个单元测试，校验每一对节点底色与文字色的对比度不低于 4.5:1。

**字体**：界面用 Barlow，数字用 Barlow Semi Condensed 并开启 tabular-nums，中文走系统回退。字号：界面 13/20，面板标题 12 加粗，节点文字默认 14。不使用全大写标签，不使用等宽字体，不加多余的小标题。

**形状与质感**

- 面板不做圆角卡片和阴影；弹出菜单与对话框圆角 8px，只用一档阴影 0 6px 20px rgba(27,36,48,.14)；按钮与输入框圆角 4px
- 选中：1.5px accent 外框，向外 2px；缩放夹点是 8px 白色方块加 1.5px accent 边框（CAD 夹点）；连接点是 8px 圆点，悬停时出现
- 对齐参考线 1px accent；框选区域用 accent-wash 填充加 1px accent 边线
- 悬停只改变背景色，不做位移

**动效**：只用于回应操作。新建节点 120ms 缩放入场；自动布局 300ms ease-out；弹出层 120ms。不做页面载入动画。遵守 prefers-reduced-motion。

**文案**：中文，动词开头，同一个动作在按钮、菜单、提示里叫同一个名字（按钮「导出」，提示「已导出」）。错误提示要说清发生了什么以及怎么解决，不道歉，不含糊。空画布提示：「空白图纸。双击画布放一个节点，或从左侧拖入形状。」并附三个模板入口。

## 7. 协作（最后做，模块化）

- 代码放在 src/core/collab/，通过 CollabAdapter 接口接入，不得污染其他模块；协作关闭或失败时，产品必须完全正常
- 房间由 URL 参数 ?room=xxx 决定；server/ 用 y-websocket；pnpm dev:collab 同时启动前端和服务
- 文档映射到 Y.Map（nodes、edges 各一个，以 id 为键）；本地命令执行后，把新旧文档的差异在一次 Yjs 事务里写入，origin 标记为 local
- 远程变更进入 store，但不写入历史。撤销就是对当前状态应用本地逆补丁，目标元素若已被他人删除则跳过。把这个限制写进文档
- awareness：显示协作者的名字、颜色和鼠标光标；顶栏显示在线头像
- 同一问题尝试两次仍无法解决，就砍掉协作，在 DECISIONS.md 写明原因，其余功能不受影响

## 8. 测试要求

- 单元测试（Vitest）：core 目录行覆盖率不低于 80%，重点覆盖命令与历史（含合并、撤销重做边界）、布局函数、zod 校验、Mermaid 往返一致、配色对比度
- 组件测试：检查器、色板、数字输入
- 端到端（Playwright）至少覆盖：
  1. 用模板新建流程图，从形状库拖入形状，连线，改文字，撤销重做
  2. 思维导图用 Tab 与 Enter 建树，折叠，自动布局
  3. ER 图新增实体、字段与关系
  4. 导出 JSON 再导入后内容一致；导出 PNG 得到非空文件
  5. 导入 Mermaid
  6. 自动保存后刷新页面，内容仍在
  7. 切换主题并记住
  8. 两个浏览器窗口协作同步（协作完成后）
- 所有 e2e 断言控制台无 error 与 warning；首页和编辑器用 axe 检查，不得有 serious 或 critical 问题

## 9. 子代理与阶段

每个阶段交给一个子代理，完成后由你验收。阶段 3 和 4 在阶段 2 完成后可以并行：画布子代理只改 features/canvas，外壳子代理只改 features 下的其他目录，通过 store 的公开接口协作。

1. 脚手架与规范：项目初始化、ESLint 规则（含 core 禁止引入 React）、tokens.css、字体、i18n、目录结构、脚本（lint、typecheck、test、e2e、build）
2. 核心层：模型、zod、命令与历史、布局、Mermaid、序列化，附单元测试
3. 画布：React Flow 集成、自定义节点与连线、选择、拖动、缩放、参考线、吸附、剪贴板、叠放、对齐
4. 界面外壳：顶栏、形状库、检查器、右键菜单、快捷键、主题、提示条、空状态
5. 三种图插件：流程图形状、思维导图行为、ER 表格节点与基数
6. 文档与 IO：首页、模板、自动保存、导入导出、图框与标题栏
7. 协作：见第 7 节
8. 质量与打磨：补齐测试，性能测量与优化，无障碍，逐屏视觉打磨
9. 课程文档：见第 11 节

## 10. 质量门（每阶段必须通过）

- pnpm lint、typecheck、test、build 全部通过，零警告
- 本阶段新增的功能有对应测试
- 在浏览器里实际操作一遍本阶段功能并截图，对照第 6 节检查
- 浏览器控制台无报错
- PROGRESS.md 已更新，改动已提交

## 11. 课程文档（放在 docs/，内容必须与真实代码一致）

- REQUIREMENTS.md：背景、用户角色、用户故事、用例（Mermaid 用例图）、功能与非功能需求
- ARCHITECTURE.md：分层图、模块图、数据模型、命令与撤销的时序图、插件机制、协作同步流程，全部用 Mermaid
- DESIGN\_PATTERNS.md：命令模式、策略与插件、观察者（store 订阅）、适配器（CollabAdapter），各写明在哪个文件、解决什么问题
- TEST\_REPORT.md：测试计划、用例表、覆盖率、e2e 结果、性能数据
- USER\_GUIDE.md：带截图的操作说明
- DEMO\_SCRIPT.md：5 分钟演示脚本，逐步写明点哪里、说什么
- DEFENSE.md：给不懂前端的人看的答辩手册，用大白话讲：项目一句话介绍；一页纸架构；三条核心链路（一次拖动如何变成可撤销的命令、导出图片怎么做、协作怎么同步）；每个设计模式对应的文件；至少 20 个老师可能追问的问题与答案，并标出相关文件路径；项目的局限与改进方向，要坦率
- README.md：安装、运行、脚本说明、目录说明

## 12. 完成定义与最终汇报

全部满足才算完成：第 5 节每项功能可用；第 10 节的质量门在最终代码上通过；docs/ 完整；pnpm install 后 pnpm dev 一条命令即可运行；截图与演示脚本对得上。

最后给我一份汇报：怎么运行、已实现与未实现的功能、测试结果、各文档位置、已知限制。然后停止，不要再继续添加功能。
