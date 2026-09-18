# 漫游引导（Guide）实现分析 & Vue3 迁移记录

> 记录日期：2026-09-14
> 涉及文件：`src/views/home.vue`、`src/utils/index.ts`、`src/views/style/variables.less`、`src/assets/images/guide/*.svg`
>
> 本文档的目的：① 沉淀原实现的核心原理；② 记录 Vue3 迁移中踩到的坑与解法；③ 列出通用化前必须解耦的宿主耦合点。

---

## 一、核心实现原理

整套引导是 **「SVG Mask 挖洞 + 步骤状态机」**，分三层：

| 层 | 实现 | 说明 |
| --- | --- | --- |
| 遮罩层 | 全屏 `position: fixed` 的 `<svg>` | `<mask>` 内用白色 rect 铺满（保留暗色遮罩），再用黑色 rect 数组「挖洞」露出目标元素 |
| 提示层 | `stepCont` 直接存 VNode | 绝对定位到目标附近，每屏的箭头方向、A/B 标记、脉冲光圈都由 CSS 类区分 |
| 数据层 | `step` 状态机 + `rectData[]` + `beforeChange` 钩子 | `watch(step, { immediate: true })` → `setStep()` 统一产出挖洞矩形与提示内容 |

### 1.1 遮罩挖洞

```html
<svg class="guide__mask" width="100vw" height="100vh">
  <defs>
    <mask :id="maskId">
      <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
      <!-- rectData：每项一个「洞」 -->
      <rect v-for="item in rectData" :x="item.left" :y="item.top"
            :rx="item.radius" :width="item.width" :height="item.height" fill="#000" />
    </mask>
  </defs>
  <rect x="0" y="0" width="100%" height="100%"
        fill="rgba(0, 0, 0, 0.3)" :style="{ mask: `url(#${maskId})` }" />
</svg>
```

mask 的规则：**白色区域可见，黑色区域透明**。所以白 rect 让整层暗色遮罩显现，黑 rect 则把暗色「抠掉」，露出底下的页面。

`maskId` 用自增 uid 生成，避免同页多个引导实例互相覆盖。

### 1.2 定位方式

```ts
const resolveTargetPosition = (dom: Element) => {
  const { left, top } = dom.getBoundingClientRect()
  return { left, top }
}
```

用 `getBoundingClientRect()` 取**视口坐标**即可，因为遮罩是 `fixed` 全屏的——视口坐标天然等于幕布坐标，不需要换算滚动条。窗口 `resize` 时整体重算（`reCalc()`）。

### 1.3 状态机

- `step`：`-1` 表示退出引导，`0 ~ 7` 为引导步骤
- `rectData`：当前需要挖出的洞（可多个）
- `stepCont`：当前提示气泡的 VNode
- `beforeChange`：**步骤切换前**执行的清理钩子（移除 pulse class、销毁动态图、清 body class），执行后即置空

> ⚠️ 容易混淆：`step` 值与 CSS 类名差 1。`step = 0` 对应 `.step-1`，`step = n` 对应 `.step-{n+1}`，退出对应 `.step-exit`。

---

## 二、步骤流程（共 8 屏）

| `step` | CSS 类 | 标题 | 挖洞目标 | 备注 |
| --- | --- | --- | --- | --- |
| 0 | `.step-1` | 切换查看模式 | `svg[name='more']` 附近 75×57 | 给目标加 `.target-effect` 脉冲光圈 |
| 1 | `.step-2` | 新增/编辑/删除字段 | 示意图左侧两行（215×30 各一） | 需要示意图已加载 |
| 2 | `.step-3` | 配置处理中心 | 示意图左侧列表 240×180 + 中间表格 429×140 | — |
| 3 | `.step-4` | 保存配置 | 示意图右下按钮 348×31 | 切到下一屏时销毁示意图 |
| 4 | `.step-5` | 编辑自定义字段 | `svg[name='more']` 附近 170×165 | `body` 加 `step_5`，宿主弹窗显示 |
| 5 | `.step-6` | 列表显示配置 | 同上 | `body` 加 `step_6` |
| 6 | `.step-7` | 校对库存 | `#check-stock`、`#SKU-POA`、`#process-center` 三处 | 顺带强开宿主搜索栏 |
| 7 | `.step-8` | 恭喜完成引导 | 无 | 居中弹窗，可「再看一次」 |
| -1 | `.step-exit` | 在这里可以再次观看指引哦！ | `svg[name='guide']` 附近 | 仅在未引导过时展示 |

**关键机制——「示意图」**：第 1~3 屏的挖洞目标并不是真实 DOM，而是运行时动态插入 `body` 的一张图片 `#guide-custom`（`position: absolute; inset: 0; margin: auto` 居中）。所有坐标都基于它的 `getBoundingClientRect()` 做偏移计算，因此**必须等图片加载完成**再算坐标（原实现是 50ms 轮询 `img.complete`，现改为 `load`/`error` 事件）。

---

## 三、Vue3 迁移改动

### 3.1 文件变更

| 文件 | 改动 |
| --- | --- |
| `src/views/home.vue` | **重写**。Vue2 Options API + `render()` → `<script setup lang="tsx">`；遮罩 SVG 移入 `<template>`；`stepCont` 用 `shallowRef<VNode>` 承载 |
| `src/utils/index.ts` | 补类型标注（原先在 `strict` 下有隐式 any）；`querySingleDom` 未命中返回 `null` 而非 `undefined` |
| `src/views/style/variables.less` | **新建**。原文件 `@import` 了它，但本仓库中并不存在 |
| `src/assets/images/guide/*.svg` | **新建** 8 张占位图：`01~07.svg`、`10.svg`（各屏的步骤图标）。原项目引用的是同名 PNG |
| `src/assets/images/guide/guide-custom.png` | **真实截图**（1099×703），替换掉最初的占位 `guide-custom.svg` |
| `.eslintrc.cjs` | 加 `ecmaFeatures.jsx`，否则 `vue-eslint-parser` 解析不了 `.vue` 内的 TSX |

> 说明：`01~07.svg`、`10.svg` 仍是占位图，仅为让工程可运行；**接入真实业务时替换成同名 PNG 即可**（记得同步改 `home.vue` 里 `customImgSrc` / CSS 中 `url()` 的扩展名）。
>
> `guide-custom.png` 已是真实截图。实测确认：图片相对尺寸虽与最初的占位图不同（1099×703 vs 1120×680），但 `setStep()` 中所有硬编码偏移（`left + 281`、`top + 603` 等）**与该图的内部布局精确吻合**，无需调整。

### 3.2 报错与解决对照

| 报错 / 问题 | 原因 | 解决 |
| --- | --- | --- |
| `@utils` 无法解析 | 本仓库无此别名（只有 `@` → `/src`） | 改为 `@/utils` |
| `require('@/assets/...')` 报错 | Vite 不支持 CJS 的 `require` | 改为 `new URL('../assets/...', import.meta.url).href` |
| `@/views/style/variables.less` 找不到 | 文件缺失 | 新建，定义 `@color-primary` |
| `<SvgIcon>` 未注册 | 原工程全局注册的组件，本仓库没有 | 写内联 SVG 图标组件 `GuideIcon` 替代 |
| `el-icon-close` 等图标不显示 | EP 已改为 SVG 图标组件，无字体图标类 | 同上，统一用 `GuideIcon` |
| `$parent` 取值报错 | 独立运行时无宿主组件，`$refs.listview` 为 `undefined` | 收敛为 `hostProxy()` 桥接层，全程可选链兜底 |
| 目标元素不存在 → `getBoundingClientRect` 抛错 | `querySingleDom` 返回 `undefined` | `resolveSafe()` 兜底返回 `(0, 0)` |
| `size="mini"` | EP 中已废弃 | 改 `size="small"` |
| `type="text"` 废弃警告 | EP 2.14 起废弃 | 改 `link` |
| `/deep/` 解析异常 | less 4 会把它当除法运算 | 该 style 本就没有 `scoped`，直接用后代选择器 |
| ESLint 无法解析 `.vue` 中的 TSX | 需显式开启 | `.eslintrc.cjs` 加 `ecmaFeatures: { jsx: true }` |

### 3.3 顺手修复的原缺陷

1. **`body.step_5` / `step_6` 泄漏**：原实现只在两个按钮的点击回调里移除 class，从第 5/6 屏点右上角 ✕ 退出时会残留。现收进 `beforeChange` 统一清理，并在 `onBeforeUnmount` 兜底。
2. **死代码**：第 7 屏的按钮里 `remove('step_7')` —— 该 class 从未被添加过，已删除。
3. **图片加载**：50ms 的 `setInterval` 轮询 → `load` / `error` 事件 + Promise。
4. **图片增删**：原实现用局部变量和 `config.guideCustomImg` 两处状态、先后不一致；现收敛为幂等的 `ensureCustomImg()` / `removeCustomImg()`。
5. **点「关闭」无反应**：原实现完全依赖宿主的 `guideSwitch` 控制显隐，独立运行时点关闭没效果。现增加本地 `visible` ref，`hideGuide()` 同时通知宿主并兜底隐藏自身。

---

## 四、验证方式

用 CDP 驱动无头 Chrome 真实跑了一遍完整流程（非仅编译通过）：

- 正向走完 8 屏，逐步核对 `rectData` 挖洞坐标与示意图实际位置
- 「上一步」回退：验证示意图被正确销毁、再次前进时重建且加载完成
- `resize` 后坐标重算（含图片宽于视口时 `margin: auto` 的边界表现）
- 点 ✕ 退出引导（分「已引导过」和「未引导过」两条分支）
- 末屏「再看一次」回到第 1 屏

结果：**控制台零 error、零 warning，无未捕获异常**。另外 `eslint`、`vue-tsc --noEmit`、`vite build` 均通过。

---

## 五、宿主耦合点（通用化的输入）

以下都是当前用空值兜底「绕过」、但**没有真正解耦**的地方。抽象成通用组件时，需要改为 props / 回调 / provide 注入：

### 5.1 状态读写

| 耦合点 | 用途 |
| --- | --- |
| `$parent.setPopoverShow` | 控制宿主弹窗的显隐（第 5、6 屏需要展示） |
| `$parent.guideSwitch` | 宿主控制引导显隐的开关 |
| `$parent.$refs.listview.$refs.filterbar` | 强开宿主的搜索栏（第 7 屏） |
| `localStorage.saleInventory_hasGuided` | 引导完成标记，决定退出时是否提示「再次观看」 |

### 5.2 全局副作用

| 耦合点 | 用途 |
| --- | --- |
| `body.classList` 的 `step_5` / `step_6` | 高亮宿主 popover 内的选项（配合 `.list-view-opeate__item` 样式） |

### 5.3 硬编码的宿主选择器

| 选择器 | 出现在 |
| --- | --- |
| `svg[name='guide']` | 退出引导（第 -1 屏） |
| `svg[name='more']` | 第 1、5、6 屏 |
| `#check-stock`、`#SKU-POA`、`#process-center` | 第 7 屏 |

### 5.4 结构性问题

- **示意图机制**：第 1~3 屏依赖运行时插入的 `#guide-custom` 图片，且所有偏移量（如 `left + 281`、`top + 603`）都是针对那张图的具体尺寸硬编码的。通用化时需要把「挖洞目标」抽象为可配置项。
- **提示内容与样式强绑定**：每屏的文案、A/B 标记、箭头方向都写死在 `setStep()` 里，`.step-N` 的 CSS 也是逐屏手写的。这是最大的抽象障碍。

---

## 六、下一步

把上述逻辑抽成通用的漫游引导组件（即项目名 `free-roam` 的由来），目标是：

- 步骤配置化（目标选择器 / 挖洞区域 / 文案 / 位置 / 箭头方向 / 生命周期钩子）
- 宿主交互通过 props 与事件回调注入，去掉 `$parent` 与硬编码选择器
- 保留 SVG mask 挖洞与 `beforeChange` 钩子这两个已验证的核心机制
