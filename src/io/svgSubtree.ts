// 导出前对 <svg> 子树的临时处理（Issue #1）。
// html-to-image 遇到 <svg> 会整棵 cloneNode(true)：其中 foreignObject 里的 HTML 元素
// 既不经过 filter（ds-export-exclude 标记不起作用），也不内联计算样式（页面 CSS 全部丢失）。
// 这里在截图前把这两件事补上：排除件写成 display:none，其余元素把计算样式写成内联样式；
// 截图结束后原样恢复，画布上看不出变化。

/** 与 filter 使用同一组类名：带这些类的元素不进导出成品 */
export function isExcluded(el: Element, exclude: readonly string[]): boolean {
  return exclude.some((c) => el.classList.contains(c))
}

const SIDES = ['top', 'right', 'bottom', 'left']
const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

/** 只复制决定外观的属性（约 50 个）：全部 300 多个计算样式都写进去，一张 ER 图的 SVG 会超过 1 MB */
const VISUAL_PROPS = [
  'display',
  'visibility',
  'opacity',
  'box-sizing',
  'width',
  'height',
  ...SIDES.flatMap((s) => [
    `margin-${s}`,
    `padding-${s}`,
    `border-${s}-width`,
    `border-${s}-style`,
    `border-${s}-color`,
  ]),
  ...CORNERS.map((c) => `border-${c}-radius`),
  'background-color',
  'background-image',
  'box-shadow',
  'outline-style',
  'appearance',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration-line',
  'text-decoration-color',
  'white-space',
  'overflow',
  'text-overflow',
  'vertical-align',
  'flex-direction',
  'align-items',
  'justify-content',
  'gap',
]

/** 把决定外观的计算样式写成内联样式；输入框另把当前值写进 value 属性（克隆只复制属性） */
function freezeStyle(el: HTMLElement): void {
  const cs = getComputedStyle(el)
  for (const p of VISUAL_PROPS) el.style.setProperty(p, cs.getPropertyValue(p))
  if (el instanceof HTMLInputElement) el.setAttribute('value', el.value)
}

/** 处理 root 内所有 svg foreignObject 中的 HTML 元素，返回恢复函数 */
export function prepareSvgSubtrees(root: HTMLElement, exclude: readonly string[]): () => void {
  const saved: Array<[HTMLElement, string | null, string | null]> = []
  for (const el of root.querySelectorAll<HTMLElement>('svg foreignObject *')) {
    saved.push([el, el.getAttribute('style'), el.getAttribute('value')])
    if (isExcluded(el, exclude)) el.style.setProperty('display', 'none')
    else freezeStyle(el)
  }
  return () => {
    for (const [el, style, value] of saved) {
      if (style === null) el.removeAttribute('style')
      else el.setAttribute('style', style)
      if (value === null) el.removeAttribute('value')
      else el.setAttribute('value', value)
    }
  }
}
