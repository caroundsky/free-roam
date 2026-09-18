import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { RectCoordinate } from '../core/types'

/** 默认圆角 */
const DEFAULT_RADIUS = 5

/** 实例自增序号 */
let uid = 0

export interface UseMaskReturn {
  /** 当前实例专属的遮罩 id */
  maskId: string
  /** 补齐默认值后的挖洞矩形 */
  maskRects: ComputedRef<RectCoordinate[]>
}

/**
 * 遮罩层的数据准备：分配唯一的 mask id，并补齐 rect 的默认值。
 *
 * mask id 必须逐实例唯一（而非写死 `#myMask`）——同一页面挂载多个引导时，
 * 重复的 id 会让后者的遮罩套用前者的挖洞区域。
 */
export function useMask(rects: Ref<RectCoordinate[]>): UseMaskReturn {
  const maskId = `fr-mask-${(uid += 1)}`

  const maskRects = computed(() =>
    rects.value.map((item) => ({
      ...item,
      radius: item.radius ?? DEFAULT_RADIUS,
    }))
  )

  return { maskId, maskRects }
}
