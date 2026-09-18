export interface StepMachineOptions {
  /** 步骤总数。传函数则每次读取，以支持步骤数动态变化 */
  total: number | (() => number)
  /** 初始步骤号，默认 0 */
  initialStep?: number
  /** 步骤变化回调（在状态更新后同步触发） */
  onChange?: (step: number, prevStep: number) => void
  /** 在最后一步继续 next，或主动调用 finish 时触发 */
  onFinish?: () => void
  /** 主动调用 exit 时触发 */
  onExit?: () => void
}

export interface StepMachine {
  readonly step: number
  readonly total: number
  next(): void
  prev(): void
  goTo(step: number): void
  exit(): void
  finish(): void
}

/**
 * 步骤状态机——只管「当前在第几步」，不涉及任何渲染。
 *
 * `exit()` 不改变步骤号，只是通知渲染层关闭引导。
 * 若需要「退出时先显示一屏提示」，把它做成一个普通步骤、用 `goTo()` 跳过去即可，
 * 比借用一个特殊步号更直白，也不会和 switch 的 default 分支打架。
 */
export function createStepMachine(options: StepMachineOptions): StepMachine {
  const { total: totalOption } = options
  const readTotal = () =>
    Math.max(0, typeof totalOption === 'function' ? totalOption() : totalOption)

  let step = options.initialStep ?? 0

  const goTo = (next: number) => {
    if (next === step) return

    const prevStep = step
    step = next
    options.onChange?.(step, prevStep)
  }

  return {
    get step() {
      return step
    },
    get total() {
      return readTotal()
    },
    next() {
      if (step >= readTotal() - 1) {
        options.onFinish?.()
        return
      }
      goTo(step + 1)
    },
    prev() {
      if (step <= 0) return
      goTo(step - 1)
    },
    goTo,
    exit() {
      options.onExit?.()
    },
    finish() {
      options.onFinish?.()
    },
  }
}
