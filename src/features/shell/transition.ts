// 页面级转场（View Transitions API）：首页卡片 ↔ 编辑器画布的共享元素形变、主题切换的圆形揭开。
// 不支持该 API、页面不可见或系统开启「减少动态效果」时直接同步更新，行为与无动效完全一致。
// 同一时刻只有一个转场：新转场开始前跳过旧的；用户在转场中按键/点击会立即跳到结尾。
import { flushSync } from 'react-dom'
import { motionAllowed } from '@/components/motion'

type VT = {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition: () => void
}
type StartVT = (cb: () => Promise<void> | void) => VT

/** 跨页共享元素的名字：首页卡片缩略图 ↔ 编辑器画布 */
export const STAGE = 'ds-stage'
const PAGE_CLASS = 'ds-vt-page'
const THEME_CLASS = 'ds-vt-theme'
const DIRS = ['ds-vt-in', 'ds-vt-out']

let sharedSource: HTMLElement | null = null
let lastPointer: { x: number; y: number } | null = null
let active: VT | null = null
let gen = 0

if (typeof window !== 'undefined') {
  const opts = { capture: true, passive: true }
  const onPointer = (e: PointerEvent) => {
    lastPointer = { x: e.clientX, y: e.clientY }
    active?.skipTransition()
  }
  const onKey = () => {
    lastPointer = null
    active?.skipTransition()
  }
  window.addEventListener('pointerdown', onPointer, opts)
  window.addEventListener('keydown', onKey, opts)
}

/** 能否播转场：API 可用、页面可见、未要求减少动态效果 */
function starter(): StartVT | null {
  const d = document as Document & { startViewTransition?: StartVT }
  if (!motionAllowed() || typeof d.startViewTransition !== 'function') return null
  if (document.visibilityState !== 'visible') return null
  return d.startViewTransition.bind(d)
}

/** 转场看门狗：最长的转场约 520ms；超过这么久还没结束（个别环境动画时钟不走）就直接跳到结尾，
 *  否则转场期间整页不响应输入 */
const WATCHDOG_MS = 1500

/** 开始一个转场：先跳过正在进行的那个；ready/updateCallbackDone 被跳过时会 reject，统一吞掉 */
function begin(start: StartVT, cb: () => Promise<void> | void): { vt: VT; mine: () => boolean } {
  active?.skipTransition()
  const my = ++gen
  const vt = start(cb)
  active = vt
  const swallow = () => undefined
  vt.ready.catch(swallow)
  vt.updateCallbackDone.catch(swallow)
  const guard = window.setTimeout(() => vt.skipTransition(), WATCHDOG_MS)
  const done = () => {
    window.clearTimeout(guard)
    if (my === gen) active = null
  }
  vt.finished.then(done, done)
  return { vt, mine: () => my === gen }
}

const inViewport = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth
}

// 注意：转场的 update 回调执行期间浏览器暂停渲染，requestAnimationFrame 不会触发（会卡到 4s 超时），只能用定时器
const settle = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const clearNames = () =>
  document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]').forEach((el) => {
    el.style.viewTransitionName = ''
  })

/** 新转场开始前清掉上一个（可能被跳过、没来得及清理的）留下的类名与命名 */
function resetRoot(): HTMLElement {
  const root = document.documentElement
  root.classList.remove(PAGE_CLASS, THEME_CLASS, ...DIRS)
  clearNames()
  return root
}

/** 点击首页卡片时登记形变起点（下一次页面转场使用后即清空） */
export function markSharedSource(el: Element | null): void {
  sharedSource = el instanceof HTMLElement ? el : null
}

/**
 * 页面转场：旧画面里登记的卡片缩略图与新画面里的画布同名，浏览器自动做位置/尺寸形变。
 * findTarget：更新后在新画面里找同名元素（编辑器 → 首页时是当前文档的卡片）；不在视口内就只做淡入淡出。
 */
export function pageTransition(update: () => void, findTarget?: () => Element | null): void {
  // 方向决定交叉淡化节奏：进编辑器时清晰的是新画面（画布），回首页时清晰的是旧画面
  const dir = findTarget ? 'ds-vt-out' : 'ds-vt-in'
  const source = sharedSource
  sharedSource = null
  const start = starter()
  if (!start) {
    update()
    return
  }
  const root = resetRoot()
  root.classList.add(PAGE_CLASS, dir)
  if (source && inViewport(source)) source.style.viewTransitionName = STAGE
  const { vt, mine } = begin(start, async () => {
    if (source) source.style.viewTransitionName = ''
    flushSync(update)
    const target = findTarget?.()
    if (target instanceof HTMLElement && inViewport(target)) target.style.viewTransitionName = STAGE
    // 留一个短窗口让画布的 effect 把节点同步进 React Flow，再截新画面，否则形变落点是一张空画布
    await settle(40)
  })
  // 被新转场接替时不清理：类名与命名已归新的那个管
  const cleanup = () => {
    if (!mine()) return
    root.classList.remove(PAGE_CLASS, ...DIRS)
    clearNames()
  }
  vt.finished.then(cleanup, cleanup)
}

/** 主题切换：新主题从点击位置（键盘触发时从右上角的菜单处）以圆形扩散揭开 */
export function themeTransition(update: () => void, origin?: { x: number; y: number }): void {
  const start = starter()
  if (!start) {
    update()
    return
  }
  const { x, y } = origin ?? lastPointer ?? { x: window.innerWidth - 40, y: 28 }
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const root = resetRoot()
  root.classList.add(THEME_CLASS)
  const { vt, mine } = begin(start, () => flushSync(update))
  vt.ready.then(
    () =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        {
          duration: 480,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      ),
    () => undefined,
  )
  const cleanup = () => {
    if (mine()) root.classList.remove(THEME_CLASS)
  }
  vt.finished.then(cleanup, cleanup)
}
