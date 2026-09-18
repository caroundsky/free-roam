import { querySingleDom } from './dom'
import type { RectCoordinate, RectInput, RectPadding, RectTargetConfig } from './types'

/** 默认内边距：让高亮区比目标元素大一圈，视觉上更舒适 */
const DEFAULT_PADDING = 5

/** 元素自身的矩形，四项均为数值 */
type ElementRect = { left: number; top: number; width: number; height: number }

export interface ResolveRectOptions {
  /** 尺寸取自元素自身时，额外留出的内边距 */
  padding?: RectPadding
}

/** 判断是否为 DOM 元素（兼容无 Element 全局的环境） */
function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element
}

/** 取元素相对视口的矩形 */
function elementToRect(el: Element): ElementRect {
  const { left, top, width, height } = el.getBoundingClientRect()

  return { left: Math.round(left), top: Math.round(top), width, height }
}

/** 把 padding 配置解析为 [水平, 垂直] 边距 */
function resolvePadding(padding: RectPadding | undefined): [number, number] {
  if (padding === false) return [0, 0]
  if (typeof padding === 'number') return [padding, padding]
  if (Array.isArray(padding)) return padding

  // true 或未配置
  return [DEFAULT_PADDING, DEFAULT_PADDING]
}

/** 按内边距向外扩一圈 */
function expandBy(rect: ElementRect, padding: RectPadding | undefined): RectCoordinate {
  const [px, py] = resolvePadding(padding)

  return {
    left: rect.left - px,
    top: rect.top - py,
    width: rect.width + px * 2,
    height: rect.height + py * 2,
  }
}

/** 解析「目标 + 微调」形态：系统定位，使用者指定尺寸与偏移 */
function resolveTarget(
  config: RectTargetConfig,
  padding: RectPadding | undefined
): RectCoordinate[] {
  const { target } = config
  const el =
    typeof target === 'function'
      ? target()
      : typeof target === 'string'
      ? querySingleDom(target)
      : target

  // 目标缺席（未渲染 / 被权限隐藏）时跳过该洞，而不是抛错
  if (!el) return []

  const rect = elementToRect(el)
  const [dx, dy] = config.offset ?? [0, 0]

  // 宽高都取自元素自身时，代为留出内边距
  if (config.width == null && config.height == null) {
    const [px, py] = resolvePadding(padding)

    return [
      {
        left: rect.left + dx - px,
        top: rect.top + dy - py,
        width: rect.width + px * 2,
        height: rect.height + py * 2,
        radius: config.radius,
      },
    ]
  }

  // 使用者指定了尺寸，说明在做精确控制，原样采用
  return [
    {
      left: rect.left + dx,
      top: rect.top + dy,
      width: config.width ?? rect.width,
      height: config.height ?? rect.height,
      radius: config.radius,
    },
  ]
}

/**
 * 把 `RectInput` 求值为视口坐标下的矩形数组。
 *
 * 按类型自动分派（见 docs 5.1）：
 * - 字符串 / 元素 → 取其自身位置与尺寸，并**默认外扩一圈内边距**
 * - 含 `target` 字段的对象 → 系统定位 + 使用者微调（未指定宽高时才外扩）
 * - 含 `left` 字段的对象 → 纯坐标，原样采用
 * - 函数 → 调用求值，**函数体每次重算都会被重新执行**；坐标完全由使用者掌控，不代为外扩
 * - 数组 → 逐项求值后合并
 *
 * 正因为函数形态每次都会重新执行，`resize` / `refresh()` 时坐标才能始终保持最新。
 */
export function resolveRect(
  input: RectInput | RectInput[] | null | undefined,
  options: ResolveRectOptions = {}
): RectCoordinate[] {
  if (input == null) return []

  if (Array.isArray(input)) {
    return input.reduce<RectCoordinate[]>((acc, item) => acc.concat(resolveRect(item, options)), [])
  }

  if (typeof input === 'function') {
    return resolveRect(input(), { padding: false })
  }

  if (typeof input === 'string' || isElement(input)) {
    const el = typeof input === 'string' ? querySingleDom(input) : input

    return el ? [expandBy(elementToRect(el), options.padding)] : []
  }

  if ('target' in input) {
    return resolveTarget(input, options.padding)
  }

  return [input]
}
