<template>
  <div ref="tipEl" class="fr-tip" :class="`fr-tip--${primary}`" :style="tipStyle">
    <slot />
    <span ref="arrowEl" class="fr-tip__arrow" aria-hidden="true" :style="arrowStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Placement } from '@floating-ui/dom'
import { computeTipPosition, primaryPlacement } from './core/positionTip'
import type { TipPosition } from './core/positionTip'
import type { StepContext } from './core/types'

defineOptions({ name: 'FreeRoamTip' })

const props = withDefaults(
  defineProps<{
    /** 步骤上下文，从插槽作用域取 */
    ctx: StepContext
    /** 首选方位；该侧空间不足时会自动翻转 */
    placement?: Placement
    /** 与挖洞区域的间距 */
    offset?: number
    /** 与视口边缘的最小留白 */
    padding?: number
  }>(),
  {
    placement: 'bottom',
    offset: 14,
    padding: 8,
  }
)

const tipEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)
const position = shallowRef<TipPosition | null>(null)

/** 主方向，用于决定箭头的朝向 */
const primary = computed(() => primaryPlacement(position.value?.placement ?? props.placement))

/**
 * 是否正在滚动。
 *
 * 滚动期间锁定方位：目标在视口中移动时会跨过「这一侧还放不放得下」的临界点，
 * 若此时仍允许翻转，气泡就会在上下之间来回跳——看起来就是「先上后下」地闪。
 */
const scrolling = ref(false)
let scrollTimer = 0
/** 竞态令牌：滚动中 update 会被高频调用，丢弃过期结果避免位置乱跳 */
let updateToken = 0

const update = async () => {
  if (!tipEl.value) return

  const myToken = ++updateToken
  const result = await computeTipPosition(props.ctx.rects, tipEl.value, arrowEl.value, {
    placement: props.placement,
    offset: props.offset,
    padding: props.padding,
    // 引导的自动滚动（ctx.scrolling）与用户手动滚动（本组件的检测）都要锁方位
    lockPlacement: scrolling.value || props.ctx.scrolling,
  })

  if (myToken !== updateToken) return
  position.value = result
}

const onScroll = () => {
  scrolling.value = true

  clearTimeout(scrollTimer)
  scrollTimer = window.setTimeout(() => {
    scrolling.value = false
    // 滚动停下后再评估方位——此时才允许翻转
    void update()
  }, 120)
}

// 步骤切换、resize、滚动都会让 ctx.rects 变成新数组，跟着重新定位
watch(() => props.ctx.rects, update)

let observer: ResizeObserver | null = null

onMounted(() => {
  void update()

  // capture: true —— scroll 事件不冒泡，这样才收得到滚动容器（而非 window）的滚动
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })

  // 气泡自身尺寸变化（图片加载、内容增减）同样需要重算
  if (typeof ResizeObserver !== 'undefined' && tipEl.value) {
    observer = new ResizeObserver(() => void update())
    observer.observe(tipEl.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onScroll, true)
  clearTimeout(scrollTimer)
})

const tipStyle = computed(() => {
  if (!position.value) return { visibility: 'hidden' as const }

  return {
    position: 'fixed' as const,
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
  }
})

const arrowStyle = computed(() => {
  const data = position.value?.arrow
  // 没有挖洞区域时（气泡居中显示）不画箭头
  if (!data) return { display: 'none' }

  return {
    left: data.x != null ? `${data.x}px` : '',
    top: data.y != null ? `${data.y}px` : '',
  }
})
</script>
