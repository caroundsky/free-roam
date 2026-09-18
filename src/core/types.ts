/**
 * FreeRoam 核心类型定义
 *
 * core/ 为框架无关的纯逻辑层：**不得引入任何 Vue 依赖**，
 * 以便将来 UMD 版本原样复用（见 docs/free-roam-spec.md 第六章）。
 */

/** 解析后的挖洞矩形。坐标为**视口坐标**——遮罩是 fixed 全屏，视口坐标即幕布坐标 */
export interface RectCoordinate {
  left: number | string
  top: number | string
  width: number | string
  height: number | string
  /** 圆角，默认 5 */
  radius?: number | string
}

/** 「目标 + 微调」形态：系统负责定位，使用者决定挖多大、偏多少 */
export interface RectTargetConfig {
  /** 目标：CSS 选择器 / DOM 元素 / 返回元素的函数 */
  target: string | Element | (() => Element | null)
  /** 相对目标左上角的偏移 [dx, dy] */
  offset?: [number, number]
  /** 不传则取目标元素自身宽度 */
  width?: number | string
  /** 不传则取目标元素自身高度 */
  height?: number | string
  radius?: number | string
}

/**
 * 完全自定义的求值函数：**每次重算（含 resize）都会被重新调用**，因此可安全用于动态目标。
 *
 * 可以返回任意 `RectInput`（包括选择器、选择器数组）——
 * 函数形态与数组形态的表达能力一致，区别只在于「什么时候决定」。
 */
export type RectResolver = () => RectInput | RectInput[] | null | undefined

/**
 * 挖洞区域相对目标元素留出的内边距——让高亮区比元素大一圈，视觉上更舒适。
 *
 * - `true`（默认）：留出默认边距
 * - `false`：紧贴元素边缘
 * - `number`：四边统一的自定义边距
 * - `[x, y]`：分别指定水平、垂直边距
 */
export type RectPadding = boolean | number | [number, number]

/**
 * 挖洞配置的输入形态，共 5 种：
 *
 * ① 选择器字符串 —— 取元素自身的位置与尺寸
 * ② DOM 元素 —— 同上
 * ③ 目标 + 微调（实战主力用法，详见 docs 5.1）
 * ④ 纯坐标 —— 使用者自己算好
 * ⑤ 函数 —— 完全自定义求值过程
 */
export type RectInput = string | Element | RectTargetConfig | RectCoordinate | RectResolver

/**
 * 提示内容。
 *
 * core 层不解释它，由各渲染层决定怎么渲染：
 * Vue 层渲染 VNode / 组件 / 渲染函数 / 字符串；UMD 层渲染字符串 / DOM 元素 / 渲染函数。
 *
 * 其中**函数形态统一约定为「接收 ctx 的渲染函数」**，这里给出签名，
 * 使用者写 `content: (ctx) => ...` 时才能拿到 ctx 的类型提示。
 */
export type ContentRenderFn = (ctx: StepContext) => unknown

export type ContentInput = string | number | ContentRenderFn | object

/** 单个步骤的配置 */
export interface StepConfig {
  /** 挖洞区域，单个或多个；不传表示不挖洞（全屏遮罩） */
  rect?: RectInput | RectInput[]
  /**
   * 挖洞区域的内边距，默认 `true`（留出默认边距，比目标元素大一圈）。
   *
   * 仅在「尺寸取自元素自身」时生效——即选择器、DOM 元素，
   * 或只给了 `target` 而未指定宽高的情况。
   * 一旦显式指定了 `width` / `height`，说明你在做精确控制，组件不再代为调整。
   */
  padding?: RectPadding
  /** 提示气泡内容 */
  content?: ContentInput
  /** 离开本步前执行（同步或异步，会被 await） */
  onLeave?: (ctx: StepContext) => void | Promise<void>
  /** 进入本步后执行 */
  onEnter?: (ctx: StepContext) => void | Promise<void>
  /** 异步等待：resolve 之后再计算 rect（如等图片加载、等接口返回） */
  waitFor?: () => Promise<unknown>
  /**
   * 目标不在视口内时是否自动滚动过去，默认 `true`。
   * 滚动结束后会重新计算挖洞坐标。
   */
  scrollIntoView?: boolean
  /** 单步覆盖遮罩颜色 */
  maskColor?: string
}

/** 步骤解析器：switch case 写法的入口 */
export type StepResolver = (step: number, ctx: StepContext) => StepConfig | Promise<StepConfig>

/** 数组形态下，元素可以是配置对象，也可以是接收 ctx 的函数（步骤号即数组下标） */
export type StepItem = StepConfig | ((ctx: StepContext) => StepConfig)

/** 步骤配置的两种写法：数组（声明式）或函数（命令式 switch case） */
export type StepsInput = StepItem[] | StepResolver

/** 暴露给使用者的能力集合，出现在 content / onEnter / onLeave / 插槽作用域中 */
export interface StepContext {
  /** 当前步骤号 */
  readonly step: number
  /** 步骤总数（不含退出步骤） */
  readonly total: number
  /**
   * 当前步骤的挖洞矩形（视口坐标）。
   *
   * 提示气泡要贴在目标旁边时用它算位置——它是响应式的，
   * 读取它会让渲染随 resize 后的坐标重算而更新。
   */
  readonly rects: RectCoordinate[]
  /**
   * 引导是否正在滚动（自动滚动到目标的过程中）。
   *
   * 滚动期间方位判断不可靠——目标在视口中移动会跨过「这一侧还放不放得下」的临界点，
   * 据此摆放的气泡会在两个方位之间来回跳。做自己的气泡定位时可以读它来避开。
   */
  readonly scrolling: boolean
  /** 下一步；已在最后一步时触发 finish */
  next(): void
  /** 上一步 */
  prev(): void
  /** 跳到指定步骤 */
  goTo(step: number): void
  /**
   * 退出引导：关闭遮罩并触发 exit 事件。
   *
   * 如果想「退出前先展示一屏提示」，把它做成一个普通步骤、用 goTo() 跳过去，
   * 再由那一屏的按钮调用 exit() —— 比借用一个魔法步号直白。
   */
  exit(): void
  /** 标记完成，触发 finish 事件 */
  finish(): void
  /** 重算当前步骤的挖洞坐标（滚动、布局变化后手动调用） */
  refresh(): void
  /** 显示引导 */
  show(): void
  /** 隐藏引导 */
  hide(): void
  /** 给 body 加类名，用于联动宿主页面样式 */
  addBodyClass(name: string): void
  /** 移除 body 类名 */
  removeBodyClass(name: string): void
  /** 查询宿主页面元素 */
  query<T extends Element = Element>(selector: string): T | null
  /** 使用者传入的任意业务数据 */
  readonly options: Record<string, unknown>
}
