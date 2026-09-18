<template>
  <div v-if="rendered" class="fr-guide" :style="rootStyle">
    <MaskLayer :mask-id="maskId" :rects="maskRects" />

    <!-- 提示内容优先级：具名插槽 step-{下标} > 默认插槽 > content 配置 -->
    <slot v-if="stepSlotName" :name="stepSlotName" :step="step" :ctx="ctx" :config="stepConfig" />
    <slot v-else-if="$slots.default" :step="step" :ctx="ctx" :config="stepConfig" />
    <component :is="contentVNode" v-else-if="contentVNode" />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  createTextVNode,
  Fragment,
  h,
  isVNode,
  onBeforeUnmount,
  useSlots,
  watch,
} from 'vue'
import type { Component, VNode } from 'vue'
import MaskLayer from './MaskLayer'
// 起别名：函数名与 lockScroll prop 同名会冲突
import { lockScroll as lockPageScroll, unlockScroll as unlockPageScroll } from './core/scroll'
import { useGuide } from './composables/useGuide'
import { useMask } from './composables/useMask'
import type { StepContext, StepsInput } from './core/types'

defineOptions({ name: 'FreeRoam' })

interface FreeRoamProps {
  /** 步骤配置：数组（声明式）或函数（switch case 命令式） */
  steps: StepsInput
  /** 步骤总数。传函数式 steps 时必须显式指定 */
  total?: number
  /** 遮罩颜色，对应 CSS 变量 --fr-mask-color */
  maskColor?: string
  /** 遮罩层叠层级，对应 CSS 变量 --fr-z-index */
  zIndex?: number
  /** 主题色，对应 CSS 变量 --fr-primary */
  primaryColor?: string
  /** 挂载后是否自动开始 */
  autoStart?: boolean
  /** 窗口 resize 时是否自动重算坐标 */
  refreshOnResize?: boolean
  /** 页面滚动时是否自动重算坐标，默认 `true` */
  refreshOnScroll?: boolean
  /**
   * 引导显示期间是否锁定页面滚动，默认 `true`。
   *
   * 挖洞坐标按视口计算，用户一滚就会与目标错位，所以默认锁住。
   * 若引导流程本身需要用户滚动，关掉它。
   */
  lockScroll?: boolean
  /** 任意业务数据，透传到 ctx.options */
  options?: Record<string, unknown>
}

// 三个视觉 props 默认留空——只在显式传入时才写入内联样式，
// 否则会盖掉使用者在样式表里对 CSS 变量的覆盖
const props = withDefaults(defineProps<FreeRoamProps>(), {
  total: undefined,
  maskColor: undefined,
  zIndex: undefined,
  primaryColor: undefined,
  autoStart: true,
  refreshOnResize: true,
  refreshOnScroll: true,
  lockScroll: true,
  options: () => ({}),
})

const emit = defineEmits<{
  change: [step: number, prevStep: number]
  enter: [step: number]
  leave: [step: number]
  finish: []
  exit: [prevStep: number]
}>()

const slots = useSlots()

/** 受控步骤：<FreeRoam v-model:step="..." /> */
const stepModel = defineModel<number>('step')

/** 步骤总数：显式传入优先，否则由数组长度推导 */
const total = computed(() => {
  if (typeof props.total === 'number') return props.total
  return Array.isArray(props.steps) ? props.steps.length : 0
})

const { step, rects, stepConfig, visible, ctx, start, replay } = useGuide({
  steps: () => props.steps,
  total: () => total.value,
  options: () => props.options,
  autoStart: () => props.autoStart,
  refreshOnResize: () => props.refreshOnResize,
  refreshOnScroll: () => props.refreshOnScroll,
  onChange: (current, prev) => {
    emit('change', current, prev)
    stepModel.value = current
  },
  onEnter: (current) => emit('enter', current),
  onLeave: (prev) => emit('leave', prev),
  onFinish: () => emit('finish'),
  onExit: (prev) => emit('exit', prev),
})

// 外部通过 v-model:step 改写步骤时，反向同步给状态机
watch(stepModel, (val) => {
  if (typeof val === 'number' && val !== step.value) ctx.goTo(val)
})

const { maskId, maskRects } = useMask(rects)

/** stepConfig 为 null 说明该步骤不存在（数组越界、函数形态未定义该步），此时整体隐藏 */
const rendered = computed(() => visible.value && stepConfig.value !== null)

/**
 * 引导显示期间锁住页面滚动——挖洞坐标按视口计算，用户一滚就会与目标错位。
 * 用标志位保证 lock / unlock 严格配对，组件在已解锁状态下卸载也不会出错。
 */
let scrollLocked = false

const syncScrollLock = (shouldLock: boolean) => {
  if (!props.lockScroll || shouldLock === scrollLocked) return

  scrollLocked = shouldLock
  if (shouldLock) lockPageScroll()
  else unlockPageScroll()
}

watch(rendered, syncScrollLock, { immediate: true })

onBeforeUnmount(() => syncScrollLock(false))

/** 具名插槽 step-{下标}；未提供时为空串，交由默认插槽 / content 兜底 */
const stepSlotName = computed(() => {
  const name = `step-${step.value}`
  return slots[name] ? name : ''
})

const contentVNode = computed<VNode | null>(() => {
  // 显式建立对 rects 的依赖：使用者的 content 函数常按目标坐标算气泡位置，
  // resize 后 rects 会被换成新数组，这里必须跟着重新渲染，否则气泡会留在旧位置
  void rects.value

  const content = stepConfig.value?.content
  if (content == null || content === '') return null

  let inner: VNode | null

  // 函数形态约定为「渲染函数」，接收 ctx 并返回 VNode
  if (typeof content === 'function') {
    inner = (content as (context: StepContext) => VNode)(ctx) ?? null
  } else if (typeof content === 'string' || typeof content === 'number') {
    inner = createTextVNode(String(content))
  } else if (isVNode(content)) {
    inner = content
  } else {
    // 组件定义
    inner = h(content as Component)
  }

  // 用 Fragment 包一层再交给 <component :is>：
  // 若直接把「组件 VNode」交给它（例如 content 返回 <FreeRoamTip> 作为根节点），
  // 在多次切换步骤时 Vue 内部 patch 会读到 null 的 component 实例而报错。
  // 包一层 Fragment 即可绕开这条边界路径。
  return h(Fragment, null, [inner])
})

const rootStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.maskColor) style['--fr-mask-color'] = props.maskColor
  if (props.zIndex != null) style['--fr-z-index'] = String(props.zIndex)
  if (props.primaryColor) style['--fr-primary'] = props.primaryColor

  return style
})

defineExpose({
  /** 显示引导并回到第 0 步 */
  start,
  /** 以当前步骤重新应用一次 */
  replay,
  next: ctx.next,
  prev: ctx.prev,
  goTo: ctx.goTo,
  exit: ctx.exit,
  finish: ctx.finish,
  refresh: ctx.refresh,
  show: ctx.show,
  hide: ctx.hide,
})
</script>

<style lang="less" src="./style/index.less"></style>
