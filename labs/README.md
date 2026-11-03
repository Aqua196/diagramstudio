# 课程实验产物

《软件工程实验》各次实验在仓库里留下的可运行/可复现产物。项目本身的设计文档见 `docs/`。

| 实验                          | 目录              | 内容                                                                                                                                                |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 实验 1 课程基础与实验环境搭建 | `lab1-hello/`     | Hello World：`node labs/lab1-hello/hello.mjs`                                                                                                       |
| 实验 3 UML 建模               | `lab3-uml/`       | 两张用例图的 draw.io 源文件（可用 draw.io 直接打开修改）与导出的 PNG                                                                                |
| 实验 4 系统概要设计           | `lab4-design/`    | 模块依赖分析脚本 `node labs/lab4-design/module-deps.mjs`；模块依赖图的 Mermaid 源文件（可导入 DiagramStudio）                                       |
| 实验 5 系统详细设计           | `lab5-design/`    | 四张类图、两张时序图的 draw.io 源文件与 PNG；E-R 图与执行命令流程图的 DiagramStudio 工程文件（首页「导入 JSON」即可打开）                           |
| 实验 6 编码规范与模块化编程   | `lab6-module/`    | 命令行工具 mmd2json（复用 `src/core` 的 Mermaid 导入模块，可单独编译运行）；`pnpm lab6:quality` 可维护性检查；编码规范见 `docs/CODING_STANDARDS.md` |
| 实验 7 版本控制与团队协作     | 仓库分支          | `main` / `dev` / `feature/*` 三级分支与合并历史（`git log --graph --all`）；协作规范 `CONTRIBUTING.md`；功能分支 CI `.github/workflows/ci.yml`      |
| 实验 8 单元测试               | `lab8-unit-test/` | 单元测试报告：21 个 Mermaid 用例的设计与结果、覆盖率对比、7 个缺陷的原因与修复、ER 字段 PK+FK 的测试驱动开发过程                                    |
