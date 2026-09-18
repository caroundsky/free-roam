<template>
  <section class="scene">
    <div class="scene__head">
      <h2>进阶用法</h2>
      <p>
        目标 + 偏移 + 自定义尺寸；一个步骤可以同时挖多个洞； 目标需要异步准备时用
        <code>waitFor</code> 等它就绪，<code>rect</code>
        写成函数则每次重算都会重新求值。
      </p>
      <p>
        第 ② 步演示<b>不用 <code>FreeRoamTip</code></b> 的写法——两个洞配两个气泡、一左一右，
        这是内置组件做不到的（它一个步骤只有一个气泡）。
      </p>
    </div>

    <div class="scene__stage">
      <input id="adv-input" class="mock-input" placeholder="关键字" />
      <button id="adv-search" class="mock-btn">搜索</button>
      <button id="adv-reset" class="mock-btn mock-btn--ghost">重置</button>

      <!-- 第 3 步的异步目标：由 waitFor 触发后才出现 -->
      <div v-if="asyncReady" id="adv-async" class="adv-async">异步加载出来的面板</div>
    </div>

    <div class="scene__foot">
      <button class="scene__start" @click="guideRef?.start()">开始引导</button>
    </div>

    <pre class="scene__code">{{ code }}</pre>

    <FreeRoam ref="guideRef" :steps="steps" :auto-start="false">
      <template #step-0="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">① 目标 + 微调</p>
          <p>洞比输入框大了一圈：<code>offset</code> 把左上角偏移 -10px，宽高也另行指定。</p>
          <div class="fr-tip__actions">
            <button class="mock-btn mock-btn--sm" @click="ctx.next()">下一步</button>
          </div>
        </FreeRoamTip>
      </template>

      <!-- ② 完全自己写：两个洞，两个气泡 -->
      <template #step-1="{ ctx }">
        <div
          v-if="ctx.rects[0]"
          class="custom-tip custom-tip--left"
          :style="bubbleStyle(ctx.rects[0], 'left')"
        >
          <span class="custom-tip__arrow" />
          <p class="custom-tip__title">② 一左一右</p>
          <p>这一步挖了两个洞，于是各配了一个气泡。</p>
        </div>

        <div
          v-if="ctx.rects[1]"
          class="custom-tip custom-tip--right"
          :style="bubbleStyle(ctx.rects[1], 'right')"
        >
          <span class="custom-tip__arrow" />
          <p class="custom-tip__title">自己写才做得到</p>
          <p>内置的 <code>FreeRoamTip</code> 一个步骤只有一个气泡。</p>
          <div class="custom-tip__actions">
            <button class="mock-btn mock-btn--sm mock-btn--ghost" @click="ctx.prev()">
              上一步
            </button>
            <button class="mock-btn mock-btn--sm" @click="ctx.next()">下一步</button>
          </div>
        </div>
      </template>

      <template #step-2="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">③ 等异步目标就绪</p>
          <p>
            <code>waitFor</code> 先把这块面板渲染出来再定位；
            <code>rect</code> 是函数，窗口尺寸变化时会被重新求值。
          </p>
          <div class="fr-tip__actions">
            <button class="mock-btn mock-btn--sm mock-btn--ghost" @click="ctx.prev()">
              上一步
            </button>
            <button class="mock-btn mock-btn--sm" @click="ctx.exit()">结束</button>
          </div>
        </FreeRoamTip>
      </template>
    </FreeRoam>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { FreeRoam, FreeRoamTip, resolveSafe } from '@caroundsky/free-roam'
import type { RectCoordinate, StepConfig } from '@caroundsky/free-roam'

defineOptions({ name: 'AdvancedDemo' })

const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)
const asyncReady = ref(false)

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 气泡与洞之间的间距 */
const GAP = 14

/**
 * 自己写气泡的定位：贴在某个洞的左侧或右侧，垂直居中。
 *
 * 关键在 transform：
 * - 摆到左侧时用 `translate(-100%, -50%)`，让气泡的**右上角**对齐到给定坐标
 * - 摆到右侧时用 `translateY(-50%)`，让**左上角**对齐
 *
 * 读取 `ctx.rects` 是响应式的，所以 resize 后气泡会自动重排。
 * 代价是翻转、边界收敛这些边界情况都得自己处理——这正是 FreeRoamTip 存在的意义。
 */
const bubbleStyle = (rect: RectCoordinate, side: 'left' | 'right') => {
  const top = `${Number(rect.top) + Number(rect.height) / 2}px`

  return side === 'left'
    ? {
        left: `${Number(rect.left) - GAP}px`,
        top,
        transform: 'translate(-100%, -50%)',
      }
    : {
        left: `${Number(rect.left) + Number(rect.width) + GAP}px`,
        top,
        transform: 'translateY(-50%)',
      }
}

// 标注 StepConfig[] 是为了给字面量补上类型上下文
// （否则 offset: [-10, -10] 会被 TS 推断成 number[] 而非 [number, number]）
const steps: StepConfig[] = [
  {
    rect: { target: '#adv-input', offset: [-10, -10], width: 250, height: 56, radius: 10 },
  },
  {
    rect: [
      { target: '#adv-search', offset: [-6, -5], width: 82, height: 46, radius: 8 },
      { target: '#adv-reset', offset: [-6, -4], width: 82, height: 46, radius: 8 },
    ],
  },
  {
    // 先等这块面板出现并完成渲染，再让组件去量它的位置
    waitFor: async () => {
      await delay(600)
      asyncReady.value = true
      await nextTick()
    },
    // 函数形态：每次重算都会重新执行，因此 resize 后坐标仍然准确
    rect: () => {
      const { left, top } = resolveSafe('#adv-async')
      const el = document.querySelector('#adv-async')
      const width = el ? el.getBoundingClientRect().width : 0
      const height = el ? el.getBoundingClientRect().height : 0
      return { left: left - 8, top: top - 8, width: width + 16, height: height + 16, radius: 10 }
    },
    // or
    // rect: '#adv-async',
    onLeave: () => {
      asyncReady.value = false
    },
  },
]

const code = `const steps = [
  // ① 目标 + 偏移 + 自定义尺寸
  { rect: { target: '#adv-input', offset: [-10, -10], width: 250, height: 56 } },

  // ② 一个步骤挖多个洞
  { rect: [
      { target: '#adv-search', offset: [-6, -6], width: 86, height: 46 },
      { target: '#adv-reset', offset: [-6, -6], width: 86, height: 46 },
  ] },

  // ③ 等异步目标就绪，再用函数形态求值坐标
  {
    waitFor: async () => { await loadData(); await nextTick() },
    rect: () => resolveSafe('#adv-async'),
  },
]

<!-- ② 不用 FreeRoamTip：两个洞，两个气泡，一左一右 -->
<template #step-1="{ ctx }">
  <div v-if="ctx.rects[0]" class="my-tip" :style="bubbleStyle(ctx.rects[0], 'left')">
    <span class="my-tip__arrow" />
    ...
  </div>
  <div v-if="ctx.rects[1]" class="my-tip" :style="bubbleStyle(ctx.rects[1], 'right')">
    <span class="my-tip__arrow" />
    ...
  </div>
</template>

/* 靠 transform 决定气泡往哪边展开 */
// 左侧：右上角对齐坐标点
{ left: rect.left - GAP + 'px', top: centerY, transform: 'translate(-100%, -50%)' }
// 右侧：左上角对齐坐标点
{ left: rect.right + GAP + 'px', top: centerY, transform: 'translateY(-50%)' }

/* 箭头贴在靠洞的那一侧 */
.my-tip--left  .my-tip__arrow { top: 50%; right: -5px; margin-top: -5px; }
.my-tip--right .my-tip__arrow { top: 50%; left: -5px;  margin-top: -5px; }`
</script>

<style scoped lang="less">
.adv-async {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 72px;
  font-size: 13px;
  color: #5a8cff;
  background: #eef3ff;
  border: 1px solid #c9d8ff;
  border-radius: 8px;
}

// ② 完全自己写的气泡：类名、定位、箭头、配色都不走组件的约定
.custom-tip {
  position: absolute;
  box-sizing: border-box;
  width: 200px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #333;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(31 35 41 / 12%);

  // 指向挖洞的箭头：旋转 45° 的方块露出一半
  &__arrow {
    position: absolute;
    width: 10px;
    height: 10px;
    background: inherit;
    transform: rotate(45deg);
  }

  // 气泡在洞的左侧 → 箭头贴它的右边缘
  &--left .custom-tip__arrow {
    top: 50%;
    right: -5px;
    margin-top: -5px;
  }

  // 气泡在洞的右侧 → 箭头贴它的左边缘
  &--right .custom-tip__arrow {
    top: 50%;
    left: -5px;
    margin-top: -5px;
  }

  &__title {
    padding-bottom: 6px;
    font-size: 14px;
    color: #5a8cff;
  }

  // 自己写的气泡也要照顾按钮间距（这里没用组件的那套变量）
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 10px;
  }
}
</style>
