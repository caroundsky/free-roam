import { arrow, computePosition, flip, offset, shift } from '@floating-ui/dom'
import type { Placement, VirtualElement } from '@floating-ui/dom'
import type { RectCoordinate } from './types'

/**
 * 把挖洞矩形包装成 floating-ui 的「虚拟参考元素」。
 *
 * 挖洞区域来自坐标计算而非真实 DOM，而气泡要贴着它定位——
 * 虚拟元素正是为这种场景准备的：只需提供一个返回矩形的方法即可。
 *
 * 多个洞时取**包围盒**：气泡对齐包围盒、箭头也指向它的中心，
 * 这与「气泡居中于高亮区域」的视觉预期一致。
 */
function toVirtualElement(rects: RectCoordinate[]): VirtualElement {
  const lefts = rects.map((item) => Number(item.left))
  const tops = rects.map((item) => Number(item.top))
  const rights = rects.map((item) => Number(item.left) + Number(item.width))
  const bottoms = rects.map((item) => Number(item.top) + Number(item.height))

  const left = Math.min(...lefts)
  const top = Math.min(...tops)
  const right = Math.max(...rights)
  const bottom = Math.max(...bottoms)

  return {
    getBoundingClientRect: () => ({
      x: left,
      y: top,
      top,
      left,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    }),
  }
}

export interface TipPositionOptions {
  /** 首选方位，空间不足时会自动翻转 */
  placement?: Placement
  /** 气泡与挖洞区域的间距 */
  offset?: number
  /** 气泡与视口边缘的最小留白 */
  padding?: number
  /**
   * 锁定方位：不启用 flip，只按给定 placement 摆放。
   *
   * 滚动期间使用。目标在视口中移动时会跨过「这一侧还放不放得下」的临界点，
   * 若此时仍允许 flip，气泡就会在上下（左右）之间来回跳，视觉上很闪。
   * 锁定后气泡只跟着平移，等滚动停下再重新评估方位。
   */
  lockPlacement?: boolean
}

export interface TipPosition {
  x: number
  y: number
  /** 实际生效的方位（可能因翻转而与传入的不同） */
  placement: Placement
  /** 箭头相对气泡的偏移；未传箭头元素时为 undefined */
  arrow?: { x?: number; y?: number }
}

/**
 * 计算气泡该摆在哪里。
 *
 * 交给 floating-ui 处理：优先放在 `placement` 一侧，
 * 空间不足时自动翻转到对侧、并沿主轴收敛到视口内；箭头跟随偏移。
 *
 * 用 `fixed` 定位策略——遮罩本身就是 fixed 全屏，两者坐标系一致，
 * 且不受页面滚动影响。
 *
 * 没有挖洞区域时（如只有一层全屏遮罩的收尾步骤），退化为**视口正中**且不显示箭头。
 */
export async function computeTipPosition(
  rects: RectCoordinate[],
  tipEl: HTMLElement,
  arrowEl?: HTMLElement | null,
  options: TipPositionOptions = {}
): Promise<TipPosition> {
  if (!rects.length) {
    const { width, height } = tipEl.getBoundingClientRect()

    return {
      x: Math.round((window.innerWidth - width) / 2),
      y: Math.round((window.innerHeight - height) / 2),
      placement: 'bottom',
      // 没有指向目标，自然也就没有箭头
      arrow: undefined,
    }
  }

  const { placement = 'bottom', offset: gap = 14, padding = 8, lockPlacement = false } = options

  const middleware = [offset(gap)]
  // 滚动期间不参与翻转：目标在视口中移动会跨过临界点，气泡会来回跳
  if (!lockPlacement) middleware.push(flip({ padding }))
  middleware.push(shift({ padding }))
  // arrow 需要放在 shift 之后，这样翻转、收敛后箭头仍能对准目标
  if (arrowEl) middleware.push(arrow({ element: arrowEl, padding: 6 }))

  const {
    x,
    y,
    placement: finalPlacement,
    middlewareData,
  } = await computePosition(toVirtualElement(rects), tipEl, {
    placement,
    strategy: 'fixed',
    middleware,
  })

  return {
    x,
    y,
    placement: finalPlacement,
    arrow: arrowEl ? { x: middlewareData.arrow?.x, y: middlewareData.arrow?.y } : undefined,
  }
}

/** 从带修饰的方位中取出主方向（`bottom-start` → `bottom`） */
export function primaryPlacement(placement: Placement): string {
  return placement.split('-')[0]
}
