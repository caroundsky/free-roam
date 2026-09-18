/**
 * FreeRoam —— 通用漫游引导组件
 *
 * 用法：
 * ```vue
 * <FreeRoam :steps="steps" @finish="onFinish" />
 * ```
 *
 * 详细 API 见 README。
 */
import type { App } from 'vue'
import FreeRoam from './FreeRoam.vue'
import FreeRoamTip from './FreeRoamTip.vue'

export { FreeRoam, FreeRoamTip }

// ---------- 工具函数 ----------
// 只保留编写步骤配置时确实会用到的两个：
// 其余（resolveRect / createStepMachine 等）属于内部实现，不外暴露
export { imgLoad, resolveSafe } from './core/dom'

// ---------- 类型 ----------
// 透出浮动方位类型，使用者不必为了写 placement 而额外安装 @floating-ui/dom
export type { Placement } from '@floating-ui/dom'
export type {
  ContentInput,
  RectCoordinate,
  RectInput,
  RectPadding,
  RectTargetConfig,
  StepConfig,
  StepContext,
  StepResolver,
  StepsInput,
} from './core/types'

/**
 * 全局注册。挂在组件对象上供 `app.use(FreeRoam)` 使用，不作具名导出。
 *
 * 只提供具名导出、不设 default —— 这既符合本项目的导入偏好，
 * 也让 UMD 产物恰好是 `window.FreeRoam.{ FreeRoam, FreeRoamTip, ... }`，
 * 不会多出一层 `.default`。
 */
const install = (app: App): void => {
  app.component('FreeRoam', FreeRoam)
  app.component('FreeRoamTip', FreeRoamTip)
}

Object.assign(FreeRoam, { install })
