# 性能测试报告（阶段8）

环境：Playwright Chromium（headless，`--disable-frame-rate-limit`），`pnpm preview` 生产构建，压测文档 500 节点 + 800 边（`window.__ds.genDoc(500, 800)`，网格布局 + 跳跃连线）。帧耗 = 单 rAF 间隔，测 120 帧取稳态 100 帧。

## 结果（2026-10-10 实测）

| 场景 | p50 | p95 | max | 门槇 <20ms |
|---|---|---|---|---|
| 大图静态帧（zoom=1 局部视口，1440×900） | 17.4ms | 17.8ms | 20.1ms | ✅ |
| 大图静态帧（zoom=1 局部视口，1280×720） | 17.5ms | 17.8ms | 23.9ms | ✅ |
| 节点拖拽（局部视口，页面内合成 pointermove 每帧一次） | 0.1–0.2ms | 0.3–0.7ms | — | ✅ |
| 全览（zoom=0.3，500 节点全可见，最坏场景） | 17.4ms | 18.2–19.0ms | 19.3–20.4ms | ✅（参考值，未断言） |

用例：`e2e/stage8.spec.ts`（双视口各跑一遍，均通过）。

## 方法说明
- 拖拽每帧一次合成 `pointermove`（走 React Flow 原生拖拽路径：onNodeDrag → 吸附 → setNodes），rAF 间隔即真实帧耗；CDP 驱动的 `mouse.move` 会把浏览器往返延迟计入测量，不采用。
- `onlyRenderVisibleElements`：视口外节点/边不入 DOM，大图局部编辑时渲染成本与可见元素数线性相关。
- 参考线写入有等值守卫（`canvasStore.setGuides` 值不变则跳过），避免每帧空重渲染。

## 已知边界
- headless 下 p95 ≈18ms 含 Chromium 合成帧开销，max 偶发 20–24ms 为 GC/合成尖峰；断言对象为稳态 p95。
- dev 模式（StrictMode 双渲染）数值约为 2 倍，生产构建是性能口径。
