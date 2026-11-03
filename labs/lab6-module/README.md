# 实验 6：编码规范与模块化编程

本实验聚焦 **Mermaid 导入导出模块**（实验 5 时序图二设计的导入链路），并用一个命令行工具证明该模块可以脱离界面单独编译运行。

## 目录内容

| 文件             | 说明                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| `mmd2json.ts`    | 命令行工具：把 Mermaid 流程图（.mmd）转成 DiagramStudio 工程文件（.json） |
| `vite.config.ts` | 工具的独立构建配置：以 Node.js 为目标打包成单个 `dist/mmd2json.mjs`       |
| `login.mmd`      | 示例输入：带失败重试与锁定的登录流程                                      |

## 模块结构

```
labs/lab6-module/mmd2json.ts      命令行入口：读文件、输出 JSON 与摘要
        │ importMermaidText(text, opts)
        ▼
src/core/io/importer.ts           组装文档：解析 → 自动布局 → createDoc
        │ parseMermaid(text)            │ dagreLayout(doc, { direction })
        ▼                               ▼
src/core/io/mermaid.ts            src/core/layout/dagre.ts
  tokenize → parseChain → addChain      分层布局，返回节点坐标
src/core/io/serialize.ts          docToJson(doc)：工程文件格式
```

模块对外只暴露四个函数：`parseMermaid`、`docToMermaid`（mermaid.ts），`importMermaidText`（importer.ts），`docToJson`（serialize.ts）。命令行工具和网页里的“导入 Mermaid”调用的是同一个 `importMermaidText`，没有另写一份。

## 构建与运行

```bash
pnpm lab6:build                                   # 生成 labs/lab6-module/dist/mmd2json.mjs（约 120 KB，依赖已打包）
pnpm lab6 labs/lab6-module/login.mmd > login.json # 摘要写到标准错误：节点 8 个，连线 9 条，方向 TB，跳过 0 行
pnpm lab6 labs/lab6-module/login.mmd -o login.json  # 直接写入文件，不经过重定向
```

退出码：0 成功；1 内容里没有可识别的流程图；2 缺少参数。生成的 `login.json` 可以在 DiagramStudio 首页用“导入 JSON”直接打开。

## 可读性与可维护性检查

```bash
pnpm lab6:quality
```

在常规 ESLint 规则之外，按《编码规范》第 4 节的阈值检查本模块：圈复杂度 ≤ 10、函数 ≤ 50 行、嵌套 ≤ 4 层、参数 ≤ 4 个。实验前该模块有 4 处超标，已重构为 0 处（行为不变，由单元测试和重构前后的逐项比对验证）：

| 函数           | 重构前             | 重构方式                                                  |
| -------------- | ------------------ | --------------------------------------------------------- |
| `parseChain`   | 圈复杂度 12        | 切分逻辑拆为 `tokenize`，建边拆为 `toEdge`                |
| `parseMermaid` | 53 行、圈复杂度 12 | 累积状态收进 `ParseState`，并入节点 / 连线拆为 `addChain` |
| `docToMermaid` | 圈复杂度 17        | 连接器选择改为优先级规则表 `connectorOf`                  |

编码规范全文见 [`docs/CODING_STANDARDS.md`](../../docs/CODING_STANDARDS.md)。
