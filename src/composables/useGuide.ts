import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { createStepMachine } from '../core/stepMachine'
import { resolveRect } from '../core/resolveRect'
import { addBodyClass, querySingleDom, removeBodyClass } from '../core/dom'
import { scrollIntoViewIfNeeded } from '../core/scroll'
import type { RectCoordinate, StepConfig, StepContext, StepsInput } from '../core/types'

export interface UseGuideOptions {
  /** 步骤配置（以取值函数传入，保证响应式） */
  steps: () => StepsInput
  /** 步骤总数 */
  total: () => number
  /** 透传给 ctx.options 的业务数据 */
  options: () => Record<string, unknown>
  /** 挂载后是否自动开始 */
  autoStart: () => boolean
  /** 窗口 resize 时是否自动重算坐标 */
  refreshOnResize: () => boolean
  /** 页面滚动时是否自动重算坐标（滚动会让视口坐标失效） */
  refreshOnScroll: () => boolean
  onChange?: (step: number, prevStep: number) => void
  onEnter?: (step: number) => void
  onLeave?: (step: number) => void
  onFinish?: () => void
  onExit?: (prevStep: number) => void
}

export interface UseGuideReturn {
  /** 当前步骤号 */
  step: Ref<number>
  /** 当前步骤的挖洞矩形（已求值为视口坐标） */
  rects: Ref<RectCoordinate[]>
  /** 当前步骤配置；为 null 表示该步骤不存在，渲染层应隐藏 */
  stepConfig: ShallowRef<StepConfig | null>
  /** 显隐状态 */
  visible: Ref<boolean>
  /** 交给使用者的能力集合 */
  ctx: StepContext
  /** 显示引导并回到第 0 步 */
  start: () => void
  /** 重算当前步骤的挖洞坐标 */
  refresh: () => void
  /** 以当前步骤重新应用一次（重新解析配置、重新执行钩子） */
  replay: () => void
}

/**
 * 把 core 的步骤状态机接到 Vue 的响应式系统上。
 *
 * 一次步骤切换的完整时序：
 * ① 执行上一步的 `onLeave`
 * ② 解析新步骤配置（数组取下标 / 函数直接调用）
 * ③ `await config.waitFor()`（如等图片加载，否则坐标会算错）
 * ④ 求值 rect、更新响应式数据
 * ⑤ 目标不在视口内则滚动过去，滚动后重算坐标
 * ⑥ 执行本步的 `onEnter`
 *
 * 其中 ②③⑤ 都可能是异步的，因此用 token 丢弃过期调用，避免快速连点时结果错乱。
 */
export function useGuide(opts: UseGuideOptions): UseGuideReturn {
  const step = ref(0)
  const rects = ref<RectCoordinate[]>([])
  const stepConfig = shallowRef<StepConfig | null>(null)
  const visible = ref(true)
  /** 是否正在自动滚动到目标 */
  const scrolling = ref(false)

  /** 当前配置的非响应式副本，供内部同步读取 */
  let config: StepConfig | null = null
  /** 竞争令牌：连续切换时丢弃过期的异步结果 */
  let token = 0

  const refresh = () => {
    rects.value = resolveRect(config?.rect, { padding: config?.padding })
  }

  const ctx: StepContext = {
    get step() {
      return step.value
    },
    get total() {
      return opts.total()
    },
    get rects() {
      return rects.value
    },
    get scrolling() {
      return scrolling.value
    },
    next: () => machine.next(),
    prev: () => machine.prev(),
    goTo: (target) => machine.goTo(target),
    exit: () => machine.exit(),
    finish: () => machine.finish(),
    refresh,
    show: () => {
      visible.value = true
    },
    hide: () => {
      visible.value = false
    },
    addBodyClass,
    removeBodyClass,
    query: querySingleDom,
    get options() {
      return opts.options()
    },
  }

  /** 解析指定步骤的配置；返回 null 表示该步骤不存在（如数组越界、函数形态未定义该步） */
  const resolveStep = async (target: number): Promise<StepConfig | null> => {
    const input = opts.steps()

    if (typeof input === 'function') {
      return (await input(target, ctx)) ?? null
    }

    const item = input[target]
    if (!item) return null

    return typeof item === 'function' ? item(ctx) : item
  }

  const applyStep = async (target: number) => {
    const myToken = (token += 1)
    const prevStep = step.value

    // ① 离开上一步
    if (config?.onLeave) await config.onLeave(ctx)
    if (myToken !== token) return
    if (prevStep !== target) opts.onLeave?.(prevStep)

    // ② 解析新步骤配置
    const resolved = await resolveStep(target)
    if (myToken !== token) return

    step.value = target
    config = resolved
    stepConfig.value = resolved
    if (prevStep !== target) opts.onChange?.(target, prevStep)

    // ③ 等待异步目标
    if (resolved?.waitFor) {
      await resolved.waitFor()
      if (myToken !== token) return
    }

    // ④ 求值挖洞区域
    refresh()

    // ⑤ 目标不在视口内时滚过去；滚动会让坐标失效，需要重算
    if (resolved?.scrollIntoView !== false) {
      // 先置位再滚动：这样「滚动开始前的那次定位」也已经知道方位不可信。
      // 否则目标还在视口外时 flip 会先翻一下，紧接着又被滚动带走，看起来就是闪。
      scrolling.value = true
      const scrolled = await scrollIntoViewIfNeeded(rects.value)

      if (myToken === token) {
        if (scrolled) refresh()
        scrolling.value = false
      }
    }

    // ⑥ 进入本步
    if (resolved?.onEnter) await resolved.onEnter(ctx)
    if (myToken !== token) return
    opts.onEnter?.(target)
  }

  /** 显示引导并回到第 0 步（已在第 0 步时强制重放） */
  const start = () => {
    visible.value = true
    if (step.value === 0) {
      void applyStep(0)
    } else {
      machine.goTo(0)
    }
  }

  // 以下三者互相引用：ctx 的方法调用 machine，machine 的变化回调触发 applyStep，
  // applyStep 又依赖 ctx 与 resolveStep。因为全部是「调用时才求值」的闭包引用，
  // 这里的声明顺序不构成循环依赖。
  const machine = createStepMachine({
    total: opts.total,
    onChange: (target) => {
      void applyStep(target)
    },
    onFinish: () => opts.onFinish?.(),
    onExit: () => {
      // 退出即关闭：不改步骤号，只是通知外部并隐藏。
      // 但要先给当前步骤一次清理机会，否则使用者移除动态 DOM、还原类名之类的逻辑会漏掉
      if (config?.onLeave) void config.onLeave(ctx)

      visible.value = false
      opts.onExit?.(step.value)
    },
  })

  /**
   * 滚动中实时重算（rAF 节流）：挖洞坐标是视口坐标，页面一滚就失效。
   *
   * 程序化滚动（`scrollIntoView`）期间同样会触发，这样挖洞是「跟着页面走」
   * 而不是「滚完再跳一下」。
   */
  let scrollRaf = 0
  const onScroll = () => {
    if (scrollRaf) return

    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0
      refresh()
    })
  }

  onMounted(() => {
    if (opts.autoStart()) void applyStep(machine.step)
    if (opts.refreshOnResize()) window.addEventListener('resize', refresh)
    if (opts.refreshOnScroll()) window.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', refresh)
    window.removeEventListener('scroll', onScroll)
    if (scrollRaf) cancelAnimationFrame(scrollRaf)
  })

  return {
    step,
    rects,
    stepConfig,
    visible,
    ctx,
    start,
    refresh,
    replay: () => {
      void applyStep(step.value)
    },
  }
}
