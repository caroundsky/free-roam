import type { StepContext } from 'free-roam'

// 用 type 而非 interface：interface 不具备隐式索引签名，无法赋值给 Vue 的 CSSProperties
type TipStyle = {
  left: string
  top: string
  transform: string
}

/** 没有挖洞区域时的兜底位置：视口正中偏上 */
const CENTERED: TipStyle = { left: '50%', top: '42%', transform: 'translate(-50%, -50%)' }

/**
 * 演示用的气泡定位：把气泡贴在当前挖洞区域的正下方居中。
 *
 * 气泡摆在哪一侧属于视觉决策，组件不内置——这里只是演示里复用的一个小工具。
 * 注意它读取 `ctx.rects`（响应式），因此 resize 后坐标变化会带动气泡重排。
 */
export function tipBelow(ctx: StepContext, gap = 14): TipStyle {
  const { rects } = ctx
  if (!rects.length) return CENTERED

  // 多个洞时取它们的包围盒，让气泡在两洞之间居中
  const lefts = rects.map((item) => Number(item.left))
  const rights = rects.map((item) => Number(item.left) + Number(item.width))
  const bottoms = rects.map((item) => Number(item.top) + Number(item.height))

  const centerX = (Math.min(...lefts) + Math.max(...rights)) / 2
  const bottomY = Math.max(...bottoms) + gap

  return { left: `${centerX}px`, top: `${bottomY}px`, transform: 'translateX(-50%)' }
}
