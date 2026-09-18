import type { RectCoordinate } from './types'

/**
 * 滚动相关工具。
 *
 * core/ 目录不得引入框架依赖。
 */

interface ScrollLockSnapshot {
  overflow: string
  paddingRight: string
}

let lockSnapshot: ScrollLockSnapshot | null = null
let lockCount = 0

/**
 * 锁定页面滚动。
 *
 * 引导期间必须锁住滚动——挖洞坐标是按视口算的，用户一滚就会与目标元素错位。
 * 同时补偿滚动条宽度，否则滚动条消失会让页面横向抖一下。
 *
 * 用引用计数支持嵌套：多个引导实例同时存在时，最后一个解锁才真正恢复。
 */
export function lockScroll(): void {
  lockCount += 1
  if (lockCount > 1) return

  const { body } = document
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

  lockSnapshot = {
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  }

  body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`
  }
}

/** 解除滚动锁定，与 lockScroll 配对调用 */
export function unlockScroll(): void {
  if (lockCount === 0) return

  lockCount -= 1
  if (lockCount > 0) return

  const { body } = document

  body.style.overflow = lockSnapshot?.overflow ?? ''
  body.style.paddingRight = lockSnapshot?.paddingRight ?? ''
  lockSnapshot = null
}

/** 等滚动停下来：连续一小段时间没有 scroll 事件即视为停止 */
function waitForScrollEnd(timeout = 700): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0

    const finish = () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
      resolve()
    }

    const onScroll = () => {
      clearTimeout(timer)
      timer = window.setTimeout(finish, 90)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // 兜底：滚动被阻止等情况下 scroll 事件可能一次都不触发
    timer = window.setTimeout(finish, timeout)
  })
}

/** 这组矩形是否已有任意一个落在视口内 */
function isInViewport(rects: RectCoordinate[], margin: number): boolean {
  const { innerWidth: vw, innerHeight: vh } = window

  return rects.some((item) => {
    const left = Number(item.left)
    const top = Number(item.top)
    const right = left + Number(item.width)
    const bottom = top + Number(item.height)

    return bottom > margin && top < vh - margin && right > margin && left < vw - margin
  })
}

/**
 * 目标不在视口内时，把它滚进可视区中间。
 *
 * 挖洞坐标是**视口坐标**，而 `window.scrollY` 是已滚动的距离，
 * 两者相加即目标的文档坐标——据此算出要让视口中心对准它需要的滚动位置。
 *
 * 注意：页面滚动被 lockScroll 锁住时，用户滚不动，
 * 但程序化的 scrollTo 仍然有效。
 *
 * @returns 是否真的发生了滚动（调用方据此决定要不要重算坐标）
 */
export async function scrollIntoViewIfNeeded(
  rects: RectCoordinate[],
  options: { margin?: number; timeout?: number } = {}
): Promise<boolean> {
  const { margin = 40 } = options

  if (!rects.length || isInViewport(rects, margin)) return false

  const [first] = rects
  const centerY = window.scrollY + Number(first.top) + Number(first.height) / 2
  const centerX = window.scrollX + Number(first.left) + Number(first.width) / 2

  window.scrollTo({
    top: Math.max(0, centerY - window.innerHeight / 2),
    left: Math.max(0, centerX - window.innerWidth / 2),
    behavior: 'smooth',
  })

  await waitForScrollEnd(options.timeout)

  return true
}
