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
