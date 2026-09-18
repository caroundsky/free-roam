# free-roam：随心漫游

用 SVG mask 挖洞的通用漫游引导组件 —— 把「新手引导」变成一份可配置的数据，而不是一坨写死的代码。

高亮页面上的任意元素，配上一段提示，逐步引导用户熟悉界面。

- **定位交给类型**：选择器、DOM 元素、`{ target, offset, width, height }`、纯坐标、自定义函数，五种形态自动分派
- **步骤两种写法**：声明式数组，或 `switch case` 函数式
- **提示两种写法**：template 具名插槽，或 tsx 直接写 `content`
- **气泡定位开箱即用**：`<FreeRoamTip>` 自动贴着高亮区摆放，空间不足会翻转，并带指向挖洞的小箭头
- **滚动场景已覆盖**：锁定用户滚动、自动滚到视口外的目标、滚动时挖洞跟随
- **运行时依赖只有一个**：`@floating-ui/dom`

> 📖 **[在线示例](https://caroundsky.github.io/free-roam/)** —— 五种用法的可交互演示，比文档直观

---

## 安装

```bash
pnpm add @caroundsky/free-roam
# 或 npm i free-roam / yarn add free-roam
```

## 引入

### 完整引入（全局注册）

```ts
import { createApp } from 'vue'
import FreeRoam from '@caroundsky/free-roam' // 组件对象自带 install
import '@caroundsky/free-roam/style.css' // ⚠️ 样式需单独引入，漏了会没有遮罩与气泡外观

const app = createApp(App)
app.use(FreeRoam)
app.mount('#app')
```

### 按需引入（局部注册）

```vue
<script setup lang="ts">
import { FreeRoam, FreeRoamTip } from '@caroundsky/free-roam'
import '@caroundsky/free-roam/style.css'
</script>

<template>
  <FreeRoam :steps="steps">
    <template #step-0="{ ctx }">
      <FreeRoamTip :ctx="ctx"> ... </FreeRoamTip>
    </template>
  </FreeRoam>
</template>
```

### CDN / 浏览器直接引入

组件提供 UMD 产物，暴露全局 `FreeRoam`：

```html
<link rel="stylesheet" href="https://unpkg.com/@caroundsky/free-roam/dist-lib/free-roam.css" />
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script src="https://unpkg.com/@caroundsky/free-roam/dist-lib/free-roam.umd.js"></script>
<script>
  const { FreeRoam, FreeRoamTip } = window.FreeRoam

  Vue.createApp(App)
    .component('FreeRoam', FreeRoam)
    .component('FreeRoamTip', FreeRoamTip)
    .mount('#app')
</script>
```

> Vue 是 peer 依赖，不打进产物；`@floating-ui/dom` 已内联，无需额外引入。

### 关于样式

组件样式**不会自动注入**，必须显式引入一次：

```ts
import '@caroundsky/free-roam/style.css'
```

样式用 `fr-` 前缀命名，全部挂在 `.fr-guide` 下，不会污染宿主页面。主题与层级通过 CSS 变量暴露，可在自己的样式里覆盖：

```css
.fr-guide {
  --fr-mask-color: rgb(0 0 0 / 30%);
  --fr-z-index: 9999;
  --fr-primary: #5a8cff;
  --fr-tip-radius: 8px;
  --fr-tip-padding: 15px 20px;
  --fr-tip-gap: 8px;
}
```

也可以用 props（`mask-color` / `z-index` / `primary-color`），它们会写成内联样式，优先级更高。

---

## 快速上手

```vue
<template>
  <button id="submit">提交</button>

  <FreeRoam ref="guideRef" :steps="steps" :auto-start="false">
    <template #step-0="{ ctx }">
      <FreeRoamTip :ctx="ctx">
        <p class="fr-tip__title">提交按钮</p>
        <p>点这里提交表单。</p>
        <button @click="ctx.next()">下一步</button>
      </FreeRoamTip>
    </template>
  </FreeRoam>

  <button @click="guideRef?.start()">开始引导</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FreeRoam, FreeRoamTip } from '@caroundsky/free-roam'
import type { StepConfig } from '@caroundsky/free-roam'
import '@caroundsky/free-roam/style.css'

const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)
const steps: StepConfig[] = [{ rect: '#submit' }]
</script>
```

更完整的用法（多洞、异步目标、函数式步骤、自定义气泡、滚动定位）请看[在线示例](https://caroundsky.github.io/free-roam/)及其源码。

---

## API

### FreeRoam Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `steps` | `StepConfig[] \| StepResolver` | — | **必填**，步骤配置 |
| `step` | `number` | — | 受控步骤，支持 `v-model:step` |
| `total` | `number` | 数组长度 | 步骤总数；传函数式 `steps` 时**必须**指定 |
| `maskColor` | `string` | — | 遮罩颜色 |
| `zIndex` | `number` | — | 遮罩层级 |
| `primaryColor` | `string` | — | 主题色 |
| `autoStart` | `boolean` | `true` | 挂载后是否自动开始 |
| `refreshOnResize` | `boolean` | `true` | 窗口 resize 时是否自动重算坐标 |
| `refreshOnScroll` | `boolean` | `true` | 页面滚动时是否自动重算坐标 |
| `lockScroll` | `boolean` | `true` | 引导显示期间是否锁定页面滚动 |
| `options` | `Record<string, unknown>` | `{}` | 任意业务数据，透传到 `ctx.options` |

> `maskColor` / `zIndex` / `primaryColor` 默认留空——只有显式传入才写内联样式，否则会盖掉你对 CSS 变量的覆盖。

### StepConfig

`steps` 数组的每一项；传函数式时，函数返回的也是它。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `rect` | `RectInput \| RectInput[]` | 挖洞区域；不传则只有全屏遮罩 |
| `padding` | `boolean \| number \| [number, number]` | 内边距，默认 `true`（比目标大一圈） |
| `content` | `ContentInput` | 提示内容（tsx / 渲染函数写法用；插槽优先） |
| `onEnter` | `(ctx) => void \| Promise<void>` | 进入本步后执行 |
| `onLeave` | `(ctx) => void \| Promise<void>` | 离开本步前执行 |
| `waitFor` | `() => Promise<unknown>` | 等它就绪后再计算坐标（如等图片加载） |
| `scrollIntoView` | `boolean` | 目标不在视口内时是否自动滚动，默认 `true` |
| `maskColor` | `string` | 单步覆盖遮罩颜色 |

**`RectInput` 的几种形态**：

```ts
rect: '#submit'                                    // 选择器：取元素自身的位置与尺寸
rect: document.querySelector('#submit')            // DOM 元素：同上
rect: { target: '#submit', offset: [-10, -10],     // 目标 + 微调（最常用）
        width: 250, height: 56, radius: 10 }
rect: { left: 100, top: 200, width: 300, height: 40 }   // 纯坐标
rect: () => resolveSafe('#dynamic-panel')          // 函数：每次重算都会重新求值
rect: ['#a', '#b']                                 // 数组：一步挖多个洞
```

### StepContext

从插槽作用域（`#step-0="{ ctx }"`）或 `content` 函数的入参拿到，是使用者操作引导的入口。

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `step` / `total` | `number` | 当前步骤号（从 0 起）/ 步骤总数 |
| `rects` | `RectCoordinate[]` | 当前挖洞矩形（**响应式**），自行定位气泡时用它算位置 |
| `scrolling` | `boolean` | 是否正在自动滚动；滚动期间方位判断不可靠，自行定位时可读它避开 |
| `next()` / `prev()` | — | 下一步 / 上一步 |
| `goTo(step)` | — | 跳到指定步骤 |
| `exit()` | — | 退出引导（关闭遮罩） |
| `finish()` | — | 标记完成，触发 `finish` 事件 |
| `refresh()` | — | 手动重算坐标 |
| `show()` / `hide()` | — | 显示 / 隐藏 |
| `addBodyClass(name)` / `removeBodyClass(name)` | — | 给 `body` 加 / 删类名，用于联动宿主样式 |
| `query(selector)` | `Element \| null` | 查询宿主页面元素 |
| `options` | `Record<string, unknown>` | 透传的 `options` prop |

### Slots

| 名称 | 作用域参数 | 说明 |
| --- | --- | --- |
| `step-{下标}` | `{ step, ctx, config }` | 按步骤注入提示内容，下标从 0 起 |
| `default` | `{ step, ctx, config }` | 未提供具名插槽时的兜底 |

优先级：具名插槽 > 默认插槽 > `content` 配置。

### Events

| 事件 | 参数 | 时机 |
| --- | --- | --- |
| `change` | `(step, prevStep)` | 步骤切换后 |
| `enter` | `(step)` | 进入某步骤（`onEnter` 之后） |
| `leave` | `(step)` | 离开某步骤 |
| `finish` | — | 走完最后一步 |
| `exit` | `(prevStep)` | 主动退出，参数是退出时所处的步骤号 |

### 实例方法

通过 `ref` 调用，与 `ctx` 上的同名方法一致：

```ts
guideRef.value?.start() // 显示引导并回到第 0 步
guideRef.value?.next() / prev() / goTo(n)
guideRef.value?.exit()
guideRef.value?.finish()
guideRef.value?.replay() // 以当前步骤重新应用一次
guideRef.value?.refresh()
guideRef.value?.show() / hide()
```

### FreeRoamTip Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ctx` | `StepContext` | — | **必填**，从插槽作用域或 `content` 入参取 |
| `placement` | `Placement` | `'bottom'` | 首选方位，空间不足时自动翻转 |
| `offset` | `number` | `14` | 与挖洞区域的间距 |
| `padding` | `number` | `8` | 与视口边缘的最小留白 |

`placement` 取值同 [floating-ui](https://floating-ui.com/docs/computePosition#placement)：`'top' | 'bottom' | 'left' | 'right'`，可加 `-start` / `-end` 修饰。

它的行为：自动摆位与翻转、画出指向挖洞的箭头（多洞时指向包围盒中心）、无挖洞时居中且不画箭头、内容尺寸变化后自动重定位。

不用它也完全可以——自己写气泡，用 `ctx.rects` 自行定位。

### 导出

只导出两个组件与两个工具函数，其余都是内部实现：

```ts
import {
  FreeRoam, // 主组件
  FreeRoamTip, // 气泡组件（自动定位 + 箭头）
  resolveSafe, // 选择器 / 元素 / null → 视口坐标（取不到时兜底 0,0）
  imgLoad, // 等待图片就绪，配合 waitFor 使用
} from '@caroundsky/free-roam'

import type {
  StepConfig,
  StepContext,
  StepResolver,
  StepsInput,
  RectInput,
  RectCoordinate,
  RectTargetConfig,
  RectPadding,
  ContentInput,
  Placement, // 透出自 @floating-ui/dom
} from '@caroundsky/free-roam'
```

> **写 `steps` 时建议标注 `StepConfig[]`**：
>
> ```ts
> const steps: StepConfig[] = [
>   { rect: { target: '#b', offset: [-10, -10], width: 250, height: 56 } },
> ]
> ```
>
> 不标注的话，`offset: [-10, -10]` 会被 TS 推断成 `number[]`，与要求的 `[number, number]` 不符而报错。标注后既能通过，也保留了「必须是两个元素」的约束。

---
