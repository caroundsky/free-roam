/**
 * 框架无关的 DOM 工具集，同时对外导出供使用者编写自定义 rect / waitFor 时使用。
 *
 * core/ 目录不得引入 Vue 依赖。
 */

/** 按选择器取首个匹配元素，未命中返回 null */
export function querySingleDom<T extends Element = Element>(selector: string): T | null {
  return (document.querySelectorAll(selector)[0] as T | undefined) ?? null
}

/**
 * 元素相对视口左上角的坐标。
 *
 * 遮罩是 `position: fixed` 的全屏 SVG，因此**视口坐标即幕布坐标**，无需换算滚动条。
 */
export function resolveTargetPosition(dom: Element): { left: number; top: number } {
  const { left, top } = dom.getBoundingClientRect()

  return { left, top }
}

/**
 * `resolveTargetPosition` 的安全版：选择器与元素皆可，取不到时兜底为 (0, 0)。
 *
 * 引导目标常因权限、条件渲染而缺席，直接取坐标会抛错，故提供此封装。
 */
export function resolveSafe(target: string | Element | null | undefined): {
  left: number
  top: number
} {
  if (!target) return { left: 0, top: 0 }

  const dom = typeof target === 'string' ? querySingleDom(target) : target

  return dom ? resolveTargetPosition(dom) : { left: 0, top: 0 }
}

/** 等待图片就绪（已加载完成则立即 resolve）；配合 StepConfig.waitFor 使用 */
export function imgLoad(img: HTMLImageElement): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    if (img.complete) {
      resolve(img)
      return
    }

    const done = () => resolve(img)
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
  })
}

/** 给 body 加类名（供 ctx.addBodyClass 使用，后续可被宿主样式联动） */
export function addBodyClass(name: string): void {
  document.body.classList.add(name)
}

/** 移除 body 类名 */
export function removeBodyClass(name: string): void {
  document.body.classList.remove(name)
}
