# DECISIONS

记录实现过程中的取舍。条目格式：`## YYYY-MM-DD 标题`，写清背景、选择与理由。

## 2026-10-10 子代理执行方式

背景：SPEC §9 要求按阶段创建子代理。项目仓库没有可交接的远端，各阶段共享同一份持续演进的工作树与 node_modules。

选择：用工作流在本机共享文件系统上运行子代理（shared-VM），每个阶段一个边界清楚的任务；阶段3/4 并行、文件所有权见 IMPL_CONTRACT §1。

理由：无远端时 git 交接不成立；共享工作树让后续阶段直接看到前序产物与已装依赖，避免每个子代理重复搭环境。

## 2026-10-10 Playwright 浏览器

背景：本机无 sudo，playwright 自带 chromium 可能缺系统库。

选择：优先自带 chromium；跑不起来时 playwright.config.ts 用 `channel: 'chrome'` 调系统 Chrome。

理由：仍是 Playwright 驱动，满足 SPEC 测试要求；系统 Chrome 无需系统依赖安装。

## 2026-10-10 交付方式

背景：SPEC 未指定代码托管位置，最终需让学生拿到含完整提交历史的代码。

选择：开发期只提交到本地 git（Conventional Commits）；完成时将仓库推送到用户 GitHub 账号下的公开仓库（若无权限则打包含 .git 的完整目录交付）。

理由：本地提交即可满足「小步提交」要求；最后统一交付避免中途打断。
