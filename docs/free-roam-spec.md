# FreeRoam 通用漫游引导组件 · 设计文档

> 状态：**v1 已实现并通过验证**
> 版本：v1.1（2026-09-15）
> 相关文档：[guide-migration.md](./guide-migration.md)（原 Vue2 实现的原理与迁移记录）
>
> **修订记录**
>
> - v0.1（09-14）：初稿
> - v0.2 ~ v0.4（09-15）：确认 `steps` 双写法；确认不内置退出二次确认与脉冲光圈；移除 IE11 约束；删除路由系统；补充构建方案
> - v1.0（09-15）：设计定稿
> - **v1.1（09-15）：实现完成**。本文按最终实现校正，与早期稿的差异集中在第五章「退出语义」与第七章「构建」

---

## 一、背景与目标

原 `home.vue` 是一套能跑通的漫游引导，但与具体业务页面深度耦合（详见迁移文档第五章）。

**目标**：抽成通用组件 `FreeRoam`，让「引导」变成一份可配置的数据。

**迭代路线**：

| 版本 | 形态 | 状态 |
| --- | --- | --- |
| v1 | Vue 3 组件（`<FreeRoam />`），产出 ES Module + UMD | ✅ 已完成 |
| v2 | 框架无关的原生渲染层，供 Vue2 / jQuery 页面使用 | 预留了 `core/`，暂未实现 |

**项目定位**：本仓库即为 free-roam 而生——既是组件源码，也是演示环境。首页展示 Demo，不引入路由。

---

## 二、设计原则

1. **简单优先，渐进增强**——最简的引导 3 行配置写完；复杂场景也不应有天花板。
2. **配置声明化，逻辑函数化**——能用配置表达的用配置，表达不了的给函数逃生舱。
3. **组件无业务副作用**——`localStorage` 标记、`body` 类名、宿主弹窗、退出二次确认一律不内置，通过钩子交还使用者。
4. **一切可重算**——所有定位配置在 `resize` / `refresh()` 时重新求值，绝不缓存坐标。
5. **核心逻辑框架无关**——`core/` 不依赖 Vue，保证 v2 能原样复用。
6. **不内置视觉特效**——脉冲光圈之类的装饰由使用者用 CSS 实现，组件只提供状态钩子。

---

## 三、使用方式总览

### 3.1 最简：高亮一个按钮

```vue
<template>
  <button id="submit">提交</button>
  <FreeRoam :steps="steps" />
</template>

<script setup lang="ts">
import { FreeRoam } from 'free-roam'

const steps = [{ rect: '#submit', content: '点这里提交' }]
</script>
```

`rect` 传选择器时，组件自动取该元素的位置与尺寸挖洞。

### 3.2 常用：目标 + 微调 / 多洞 / 异步目标

```ts
import { nextTick, resolveSafe } from 'free-roam'

const steps: StepConfig[] = [
  // ① 目标 + 偏移 + 自定义尺寸
  { rect: { target: '#adv-input', offset: [-10, -10], width: 250, height: 56 } },

  // ② 一个步骤挖多个洞
  {
    rect: [
      { target: '#adv-search', offset: [-6, -6], width: 86, height: 46 },
      { target: '#adv-reset', offset: [-6, -6], width: 86, height: 46 },
    ],
  },

  // ③ 等异步目标就绪，再用函数形态求值坐标
  {
    waitFor: async () => {
      await loadData()
      await nextTick()
    },
    rect: () => resolveSafe('#async-panel'),
  },
])
```

> 标注 `StepConfig[]` 是给字面量补类型上下文：不标的话，`offset: [-10, -10]` 会被推断成 `number[]` 而非 `[number, number]`。

### 3.3 进阶：函数式步骤（等价于原来的 `setStep` + `switch case`）

```ts
const steps: StepResolver = (step, ctx) => {
  switch (step) {
    case 0:
      ctx.addBodyClass('highlight') // 联动宿主样式
      return {
        rect: { target: '#more', offset: [-22, 0], width: 170, height: 165 },
        content: (c) => <Tip5 ctx={c} />,
        onLeave: () => ctx.removeBodyClass('highlight'),
      }
    // ...
  }
}

<FreeRoam :steps="steps" :total="7" />
```

> 数组与函数只是同一件事的两种写法，内部统一为「给定 step，产出一份 StepConfig」。数组元素也可以是函数，两者可混用。

---

## 四、API

### 4.1 Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `steps` | `StepConfig[] \| StepResolver` | — | **必填**。步骤配置 |
| `step` | `number` | — | 受控步骤，支持 `v-model:step` |
| `total` | `number` | 数组长度 | 步骤总数；传函数式 `steps` 时**必须**指定 |
| `maskColor` | `string` | — | 遮罩颜色，写入 CSS 变量 |
| `zIndex` | `number` | — | 层级，写入 CSS 变量 |
| `primaryColor` | `string` | — | 主题色，写入 CSS 变量 |
| `autoStart` | `boolean` | `true` | 挂载后是否自动开始 |
| `refreshOnResize` | `boolean` | `true` | 窗口 resize 时是否自动重算 |
| `refreshOnScroll` | `boolean` | `true` | 页面滚动时是否自动重算（见 5.7） |
| `lockScroll` | `boolean` | `true` | 引导显示期间是否锁定页面滚动（见 5.7） |
| `options` | `Record<string, unknown>` | `{}` | 业务数据，透传到 `ctx.options` |

> 三个视觉 props 默认**留空**——只有显式传入时才写内联样式，否则会盖掉使用者在样式表里对 CSS 变量的覆盖。

### 4.2 Slots

```vue
<FreeRoam :steps="steps" :total="8">
  <template #step-0="{ ctx }">
    <div class="fr-tip" :style="tipBelow(ctx)">...</div>
  </template>

  <!-- 兜底 -->
  <template #default="{ step, ctx }">第 {{ step + 1 }} 步</template>
</FreeRoam>
```

- 插槽名：`step-{下标}`（下标从 0 开始）
- 作用域参数：`{ step, ctx, config }`
- **优先级**：具名插槽 > 默认插槽 > `content` 配置

tsx 写法用 `v-slots`：

```tsx
<FreeRoam steps={steps} v-slots={{ 'step-0': ({ ctx }) => <div>...</div> }} />
```

### 4.3 Events

| 事件 | 参数 | 时机 |
| --- | --- | --- |
| `change` | `(step, prevStep)` | 步骤切换后 |
| `enter` | `(step)` | 进入某步骤（`onEnter` 之后） |
| `leave` | `(step)` | 离开某步骤 |
| `finish` | — | 走完最后一步 |
| `exit` | `(prevStep)` | 主动退出，参数是退出时所处的步骤号 |

> 「引导完成标记」「退出二次确认」不内置，监听 `@finish` / `@exit` 自己处理。

### 4.4 实例方法（`ref`）

```ts
const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)

guideRef.value?.start() // 显示引导并回到第 0 步
guideRef.value?.next() // 下一步
guideRef.value?.prev() // 上一步
guideRef.value?.goTo(3) // 跳到第 3 步
guideRef.value?.exit() // 退出引导（关闭遮罩）
guideRef.value?.finish() // 标记完成（触发 finish 事件）
guideRef.value?.replay() // 以当前步骤重新应用一次
guideRef.value?.refresh() // 手动重算坐标
guideRef.value?.show() // 显示
guideRef.value?.hide() // 隐藏
```

### 4.5 核心类型

```ts
interface StepConfig {
  /** 挖洞区域，单个或多个；不传表示不挖洞（全屏遮罩） */
  rect?: RectInput | RectInput[]
  /** 挖洞区域的内边距，默认 true（比目标元素大一圈），详见 5.1 */
  padding?: RectPadding
  /** 提示内容 */
  content?: ContentInput
  /** 离开本步前执行（会被 await） */
  onLeave?: (ctx: StepContext) => void | Promise<void>
  /** 进入本步后执行 */
  onEnter?: (ctx: StepContext) => void | Promise<void>
  /** 异步等待：resolve 之后再计算 rect */
  waitFor?: () => Promise<unknown>
  /** 目标不在视口内时是否自动滚动过去，默认 `true`（见 5.7） */
  scrollIntoView?: boolean
  /** 单步覆盖遮罩颜色 */
  maskColor?: string
}

/**
 * 提示内容。core 不解释它，由各渲染层决定怎么渲染。
 * 函数形态统一约定为「接收 ctx 的渲染函数」。
 */
type ContentInput = string | number | ((ctx: StepContext) => unknown) | object
```

`StepContext` 提供：`step` / `total` / **`rects`** / **`scrolling`** / `next` / `prev` / `goTo` / `exit` / `finish` / `refresh` / `show` / `hide` / `addBodyClass` / `removeBodyClass` / `query` / `options`。

> `ctx.rects` 是当前挖洞矩形的**响应式**快照——提示气泡要贴在目标旁边时用它算位置，坐标随 resize 变化会自动带动气泡重排。

### 4.6 对外导出的工具函数

```ts
import {
  FreeRoam,
  FreeRoamTip, // 气泡组件：自动定位 + 指向箭头
  resolveTargetPosition, // 元素 → 视口坐标
  resolveSafe, // 选择器/元素/null → 视口坐标（兜底 0,0）
  querySingleDom, // 查询单个 DOM
  imgLoad, // 等待图片就绪
  addBodyClass, // 加 body 类名
  removeBodyClass, // 移除 body 类名
  resolveRect, // RectInput → RectCoordinate 求值器
  createStepMachine, // 步骤状态机（框架无关）
  install, // 全局注册 app.use(FreeRoam)
} from 'free-roam'
```

---

## 五、关键设计决策

### 5.1 `rect` 定位：系统算、用户算，都支持

用类型自动分派，不做取舍：

```ts
type RectInput =
  | string // ① 选择器：取元素自身的位置与尺寸
  | Element // ② DOM 元素：同上
  | {
      // ③ 目标 + 微调（★ 实战主力）
      target: string | Element | (() => Element | null)
      offset?: [number, number]
      width?: number | string // 不传则用元素自身尺寸
      height?: number | string
      radius?: number | string
    }
  | { left; top; width; height; radius? } // ④ 纯坐标
  | (() => RectInput | RectInput[] | null) // ⑤ 函数：每次重算都重新求值，可返回上面任意形态
```

分派规则：含 `target` → ③；含 `left` → ④；是函数 → ⑤；字符串/元素 → ①②。

> **为什么 ③ 是主力而非 ①②？**
> 梳理原 8 屏实现后发现：**没有任何一步直接用元素自身的尺寸**——挖洞区域往往刻意比目标大一圈，或只截取元素的一部分。

**目标不是 DOM 时**（如运行时插入的示意图）用函数形态：

```ts
{
  waitFor: () => imgLoad(panelImg), // 等图片加载完，否则量的位置是错的
  rect: () => {
    const { left, top } = resolveSafe(panelImg)
    return { left: left + 731, top: top + 603, width: 348, height: 31 }
  },
}
```

**目标缺席不报错**：取不到元素时该洞直接跳过（返回空数组），而不是抛错。

#### 内边距（`padding`）

取元素自身尺寸时，挖洞会**默认向外扩一圈**（8px）——高亮区比元素大一圈，视觉上更透气：

```ts
type RectPadding = boolean | number | [number, number]

{ rect: '#submit' }                      // 默认外扩 8px
{ rect: '#submit', padding: 12 }         // 四边各 12px
{ rect: '#submit', padding: [16, 8] }    // 水平 16、垂直 8
{ rect: '#submit', padding: false }      // 紧贴元素边缘
```

**只在「尺寸取自元素自身」时生效**：

| 形态 | 是否外扩 |
| --- | --- |
| ① 选择器 / ② DOM 元素 | ✅ 默认外扩 |
| ③ 目标 + 微调：未指定 `width`/`height` | ✅ 默认外扩 |
| ③ 目标 + 微调：**指定了** `width`/`height` | ❌ 视为精确控制，原样采用 |
| ④ 纯坐标 / ⑤ 函数 | ❌ 坐标由使用者完全掌控 |

这条边界是有意为之：一旦使用者动手指定了尺寸，说明他要的是精确结果，组件不该再代为调整。

### 5.2 `setStep` 保留，统一进 `steps`

原来的命令式 `switch case` 写法完整保留，与声明式数组**统一为同一个入口**：

```ts
const steps: StepConfig[] = [...] // 声明式
const steps: StepResolver = (step, ctx) => { switch (step) {...} } // 命令式
```

组件内部都归结为「给定 step → 产出一份 StepConfig」。

### 5.3 `stepCont`：tsx 与 template 双写法

| 习惯 | 写法 |
| --- | --- |
| tsx | `content: <MyTip />` 或 `content: (ctx) => <MyTip />` |
| template | `<template #step-0="{ ctx }">...</template>` |

两者能力对等（`ctx` 都能拿到），插槽优先于 `content`。

### 5.4 样式隔离：命名空间前缀 + CSS 变量

1. 所有内部类名加 `fr-` 前缀（`.fr-guide`、`.fr-guide__mask`、`.fr-tip`…）
2. 主题与层级通过 CSS 变量暴露，可在自己的样式里覆盖：

   ```css
   .fr-guide {
     --fr-mask-color: rgba(0, 0, 0, 0.3);
     --fr-z-index: 9999;
     --fr-primary: #5a8cff;
     --fr-tip-radius: 8px;
   }
   ```

3. 常用项同时提供 props 快捷方式（等价，props 优先级更高）
4. **不使用 `scoped`**——提示内容是使用者的 VNode，`scoped` 对它不生效，统一靠前缀避让
5. **组件内不写任何宿主元素样式**，需要联动时由使用者用 `ctx.addBodyClass()` + 自己的 CSS 实现

### 5.5 退出语义（实现期调整）

**`exit()` 就是「退出」——关闭遮罩并触发 `exit` 事件**，不改变步骤号。

早期设计曾用「跳到保留步骤号 -1」来表达退出，但那样会与函数式 `switch` 的 `default` 分支打架（`default` 会捕获 -1，导致退出退不掉），语义也隐晦。改为现在的直白设计。

**需要「退出前先显示一屏提示」时**，把它做成一个普通步骤、用 `goTo()` 跳过去即可：

```ts
const EXIT_TIP_STEP = 6

// 气泡上的 ✕ 不是直接退出，而是跳到提示屏
<span onClick={() => ctx.goTo(EXIT_TIP_STEP)}>✕</span>

// 提示屏上的按钮才调用 exit()
<button onClick={() => ctx.exit()}>我知道了</button>
```

### 5.6 气泡定位：交给成熟库，但做成「可选件」

气泡要贴着挖洞区域摆，还要处理空间不足时翻转、边界收敛、箭头跟随——自己实现代码量大，且滚动容器、`transform` 祖先等边界情况很容易踩坑。

**选型：`@floating-ui/dom`**（`@floating-ui/vue` 的底层库）。三个理由：

1. **框架无关**——放在 `core/` 里，v2 的 UMD 版本原样复用
2. **支持虚拟元素**——挖洞区域来自坐标计算而非真实 DOM，用 `VirtualElement` 正好喂给它
3. middleware 齐全：`offset` / `flip`（翻转）/ `shift`（边界收敛）/ `arrow`（箭头定位）正好对应全部需求

**暴露形式**：导出 `<FreeRoamTip>` 组件（可选件），而不是把定位能力焊死在 `FreeRoam` 里。不想用就自己写 `<div class="fr-tip">`，用 `ctx.rects` 自行定位——自由度保留。

**多镂空时箭头指向哪里**：指向所有洞的**包围盒中心**。

| 策略 | 取舍 |
| --- | --- |
| **包围盒中心**（采用） | 与「气泡居中于高亮区域」天然对齐，箭头垂直连接气泡与区域几何中心；原实现里两个洞时箭头落在中间，视觉最稳 |
| 指向最近的洞 | 指向明确，但气泡不居中、箭头偏在一边，视觉不对称 |
| 多洞时不显示箭头 | 保守，但丢了指向性 |

**实现要点**：

- 用 `strategy: 'fixed'`——遮罩本身就是 fixed 全屏，两者坐标系一致，且不受滚动影响
- 定位完成前先用 `visibility: hidden` 藏住，避免「先出现在左上角再跳过去」的闪烁
- 监听气泡自身的 `ResizeObserver`：内容变化（图片加载等）也要重新定位
- **没有挖洞区域时不走 floating-ui**：该步骤只有全屏遮罩（如收尾屏），
  气泡直接按「视口正中」计算坐标并隐藏箭头——没有指向目标，画箭头没有意义

### 5.7 滚动处理

**锁定滚动（`lockScroll`，默认开）**：挖洞坐标按视口计算，用户一滚就与目标错位。锁定时一并补偿滚动条宽度，否则滚动条消失会让页面横向抖一下；用引用计数支持多个引导实例嵌套。

**目标在视窗外时自动滚动（`scrollIntoView`，默认开）**：进入步骤时检测目标是否可见，不可见则平滑滚过去，**滚动结束后重算坐标**（滚动会让算好的坐标失效）。

**滚动时跟着走（`refreshOnScroll`，默认开）**：监听 `scroll` 并用 `rAF` 节流重算坐标。没有它的话，滚动期间挖洞会停在原位、滚完才「跳」过去；有了它是平滑跟随。程序化滚动与用户手动滚动都会触发。

**滚动期间锁定气泡方位**（`FreeRoamTip` 内部处理，`ctx.scrolling` 对外暴露）：

目标在视口中移动时会跨过「这一侧还放不放得下」的临界点，若此时仍允许 `flip`，气泡就会在上下之间来回跳——看起来就是「先上后下」地闪。

处理方式是**滚动期间不启用 flip**，气泡只平移、不换边，滚完再评估一次。这里有个时序细节：`ctx.scrolling` 必须在**发起滚动之前**就置位，否则「滚动开始前的那次定位」仍会先翻一下再被滚走。

自己做气泡定位时也可以读 `ctx.scrolling` 来避开同样的问题。

三者不冲突：`overflow: hidden` 只挡用户滚动，程序化的 `scrollTo` 照样有效；滚动监听则保证整个过程中挖洞都不跑偏。

### 5.8 其余约定

- **退出时也会执行当前步骤的 `onLeave`**——否则使用者清理动态 DOM 的逻辑会漏掉
- **函数式 `rect` 每次重算都会重新执行**，因此 resize 后坐标始终准确
- **连续切换用 token 丢弃过期调用**，避免快速连点时异步结果错乱
- **`content` 返回的 VNode 会用 Fragment 包一层**再交给 `<component :is>`——若直接把「组件 VNode」（如 `content` 返回的 `<FreeRoamTip>` 作根节点）交给它，多次切换步骤时 Vue 内部 patch 会读到 null 的组件实例而报错

**关于步骤共享的临时资源**（写步骤配置时的常见坑）：

步骤可以双向切换，所以**任何步骤都不能假设「上一步已经把它准备好了」**。需要临时资源（运行时插入的 DOM、动态图片等）的步骤，应当**自己确保它在、离开时清掉**：

```ts
case 1:
  return {
    waitFor: ensurePanel,   // 幂等：已存在则直接返回
    onLeave: removePanel,   // 离开就清，不留给下一步
    rect: () => { /* ... */ },
  }
```

看起来「每次切换都重建」有些浪费，但换来的是一致性：无论是前进、后退还是跳转，该有的资源一定在、不该留的一定不留。图片这类资源有浏览器缓存，重建几乎是瞬时的。

---

## 六、架构分层

```text
src/                       # ★ 组件本体就在 src 根（示例里以包名 free-roam 引入）
├── index.ts               # 包入口：组件 + 工具函数 + 类型
├── FreeRoam.vue           # 主组件：遮罩 + 提示容器 + 插槽/content 分发
├── FreeRoamTip.vue        # 气泡组件：定位 + 箭头（可选用，也可自己写）
├── MaskLayer.tsx          # 遮罩层（SVG mask 挖洞）
│
├── core/                  # ★ 框架无关的纯逻辑，v2 直接复用
│   ├── types.ts           # 全部类型定义（无 Vue 依赖）
│   ├── dom.ts             # resolveTargetPosition / resolveSafe / querySingleDom / imgLoad
│   ├── resolveRect.ts     # RectInput → RectCoordinate 的求值器
│   ├── stepMachine.ts     # 步骤状态机
│   ├── positionTip.ts     # 气泡定位（封装 @floating-ui/dom）
│   └── scroll.ts          # 滚动锁定 + 「滚进视口」
│
├── composables/
│   ├── useGuide.ts        # 把 core 接到 Vue 响应式系统（步骤切换时序、竞争令牌）
│   └── useMask.ts         # 分配唯一 mask id、补齐 rect 默认值
│
└── style/
    └── index.less         # 全部 fr- 前缀样式 + CSS 变量（含气泡箭头）
```

**依赖策略**：`@floating-ui/dom` 是框架无关的定位算法库，**打进产物**（UMD 使用者无需单独引入）。Vue 仍然外置为 peer 依赖。

**关键约束**：`core/` 目录下不出现任何 `import ... from 'vue'`，也不内置任何图片资源（原因见 7.2）。

---

## 七、构建与产物

### 7.1 两种产物

`pnpm build:lib`（配置见 `vite.lib.config.ts`）一次产出：

| 产物 | 大小 | 用途 |
| --- | --- | --- |
| `free-roam.es.js` | 8.3 kB（gzip 3.1 kB） | 现代打包器 `import` |
| `free-roam.umd.js` | 24.8 kB（gzip 9.5 kB） | `<script>` 直接引入，暴露 `window.FreeRoam` |
| `free-roam.css` | 0.9 kB | 组件样式 |

> UMD 体积里含打进产物的 `@floating-ui/dom`（约 16 kB）——它是框架无关的定位算法，内联进来才能让 `<script>` 使用者不必额外引入依赖。

**Vue 作为 peer 依赖外置**（不打进产物）：UMD 版本依赖页面上的全局 `Vue`。

**无 default 导出**——包只提供具名导出，因此 UMD 产物恰好是 `window.FreeRoam.{ FreeRoam, resolveSafe, ... }`，不多一层 `.default`：

```html
<script src="vue.global.prod.js"></script>
<script src="free-roam.umd.js"></script>
<script>
  const { FreeRoam } = window.FreeRoam
  app.use(FreeRoam) // 组件对象自带 install
  app.mount('#app')
</script>
```

### 7.2 Vite 8 / Rolldown 实测结论

Vite 8 底层已从 Rollup 换成 **Rolldown**，UMD 行为与 Vite 7 有差异，实测：

| 行为 | 结论 | 对设计的影响 |
| --- | --- | --- |
| 资源内联 | lib 构建把所有资源转 base64（实测 43KB 的 PNG 也被内联），不产出独立文件 | **组件不内置图片**，否则包体积失控 |
| 动态 `import.meta.url` | 编译为 `{}.url` 即 `undefined` | **组件不靠它解析资源路径** |
| 语法降级 | 不做，产物保留 `?.` / `??` / 箭头函数 | 目标为现代浏览器 |
| external globals | Rolldown 曾有不链接 external 全局变量的问题（[rolldown#8349](https://github.com/rolldown/rolldown/issues/8349)） | 实测本项目 UMD 产物正常链接到全局 `Vue`，未受影响 |

> `new URL('./x.png', import.meta.url)` 这种**静态形式**会被编译期求值，实测正常；只有动态使用 `import.meta.url` 才会变成 `undefined`。

---

## 八、项目结构

清理后（原模板残留的路由、请求层、状态管理、错误页均已移除）：

```text
src/                           # ★ 只放组件本体（结构见第六章）

example/                       # 演示环境（与组件源码分离）
├── App.vue                    # tab 容器 + 全局样式
├── main.ts                    # 演示入口
├── demo.less                  # 演示页共享样式
├── tip.ts                     # 演示用的气泡定位工具
├── assets/
│   └── guide-custom.png       # 业务回归场景的示意图
└── components/
    ├── basicDemo.vue          # 基础用法（选择器 + 具名插槽）
    ├── advancedDemo.vue       # 进阶（偏移 / 多洞 / waitFor）
    ├── tsxDemo.tsx            # 函数式 steps + tsx 写 content
    └── businessDemo.vue       # 业务回归验证

index.html                     # 指向 example/main.ts
```

演示侧以**包名**引入，与组件发布后使用者的写法完全一致：

```ts
import { FreeRoam, resolveSafe } from 'free-roam'
```

Vite 侧靠 `vite.config.ts` 的 alias（`'free-roam': '/src'`）映射到源码，TS 侧靠 `tsconfig.json` 的 `paths`，两边都不需要预先构建。

**已移除**：`src/router/`、`src/api/`、`src/api.config/`、`src/stores/`、`src/app.config.ts`、`src/utils/`、`src/views/ErrorPage/`，以及随之失去用途的依赖（`axios`、`axios-cache-adapter`、`lodash`、`nprogress`、`pinia`、`vue-router`、`element-plus`、`@caroundsky/el-plus-dialog-service`、`@vue/devtools-api`）。

---

## 九、Demo

首页即 Demo（无路由），四个场景：

| 场景 | 覆盖能力 |
| --- | --- |
| **基础用法** | `rect: '#selector'`、内边距对比（默认外扩 / `padding: false`）、`<FreeRoamTip>` 自动定位与指向箭头 |
| **进阶用法** | 目标 + 偏移 + 自定义尺寸、一步多洞、`waitFor` 等异步目标、函数式 `rect` |
| **函数式 + TSX** | `switch case` 组织步骤、JSX 直写 `content`、`ctx.addBodyClass` 联动宿主样式 |
| **滚动定位** | 长页面下目标在视口外时自动滚动过去；滚动期间挖洞跟随；`lockScroll` 锁住用户滚动 |
| **业务回归** | 复刻原业务页面的 7 屏流程：示意图作为挖洞目标、body 类名联动、三洞并挖、退出提示屏 |

**业务回归场景是验收标准**：若原有业务逻辑无法用新 API 平移（除样式类名外无需改动），说明抽象不到位。实测结论：**通过**——原实现的所有挖洞偏移（`+20,+66`、`+281,+130`、`+731,+603` 等）在新组件下无需调整即可精确命中。

---

## 十、验证记录

| 验证项 | 方式 | 结果 |
| --- | --- | --- |
| 静态检查 | `eslint` / `vue-tsc --noEmit` | 通过 |
| 演示页构建 | `vite build` | 通过 |
| 组件库构建 | `vite build --config vite.lib.config.ts` | 通过 |
| 交互流程 | CDP 驱动无头 Chrome 走完全部场景 | 控制台零 error / warning |
| 挖洞精度 | 逐屏比对挖洞与目标元素的 `getBoundingClientRect` | 像素级吻合 |
| resize 重算 | `Emulation.setDeviceMetricsOverride` 改视口 | 坐标正确重算 |
| **UMD 产物** | `file://` 打开纯 `<script>` 页面（无打包器） | 正常渲染、挖洞吻合、`window.FreeRoam` 暴露全部 API |
| **气泡定位** | 多档视口下核对气泡与挖洞的位置关系 | 首选 bottom；空间不足翻转为 top；窄视口下收敛进视口；箭头与洞中心偏差 0px |
| **锁定滚动** | 引导激活时检查 `body.style` | `overflow: hidden`，且补偿了滚动条宽度 |
| **自动滚动** | 先把页面滚到底部，再启动引导 | 目标被平滑滚回视口，滚动结束后坐标随之重算 |
| **内容根节点为组件** | `content` 返回 `<FreeRoamTip>` 作为根节点，连续切换 7 屏 | 修复了 Vue patch 边界问题后零错误（见 5.8） |

> v0.1 中提到但未实现的两项：`transition` prop（步骤切换过渡）与自动生成 `.d.ts`。前者暂无需求，后者可用 `vue-tsc` 单独配置产出。
