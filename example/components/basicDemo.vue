<template>
  <section class="scene">
    <div class="scene__head">
      <h2>基础用法</h2>
      <p>
        <code>rect</code>
        传选择器字符串，组件自动取该元素的位置与尺寸挖洞，并<strong>默认外扩一圈内边距</strong>。
        提示内容用 <code>&lt;FreeRoamTip&gt;</code> 包裹即可获得自动定位与指向挖洞的小箭头。
      </p>
    </div>

    <div class="scene__stage">
      <div class="mock-card">
        <span>一张普通的卡片</span>
        <button id="basic-submit" class="mock-btn">提交</button>
      </div>
    </div>

    <div class="scene__foot">
      <button class="scene__start" @click="guideRef?.start()">开始引导</button>
    </div>

    <pre class="scene__code">{{ code }}</pre>

    <FreeRoam ref="guideRef" :steps="steps" :auto-start="false">
      <template #step-0="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">① 默认：外扩一圈</p>
          <p>洞比按钮大了一圈，箭头指向高亮区域中心。</p>
          <div class="fr-tip__actions">
            <button class="mock-btn mock-btn--sm" @click="ctx.next()">下一步</button>
          </div>
        </FreeRoamTip>
      </template>

      <template #step-1="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">② 紧贴边缘</p>
          <p>同一个按钮，设 <code>:padding="false"</code> 后洞与元素完全一致。</p>
          <div class="fr-tip__actions">
            <button class="mock-btn mock-btn--sm mock-btn--ghost" @click="ctx.prev()">
              上一步
            </button>
            <button class="mock-btn mock-btn--sm" @click="ctx.next()">下一步</button>
          </div>
        </FreeRoamTip>
      </template>

      <template #step-2="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">完成</p>
          <p>不传 <code>rect</code> 的步骤，只有一层全屏遮罩。</p>
          <div class="fr-tip__actions">
            <button class="mock-btn mock-btn--sm" @click="ctx.exit()">关闭</button>
          </div>
        </FreeRoamTip>
      </template>
    </FreeRoam>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FreeRoam, FreeRoamTip } from '@caroundsky/free-roam'

defineOptions({ name: 'BasicDemo' })

const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)

const steps = [
  // 自动取元素位置与尺寸，并默认外扩一圈
  { rect: '#basic-submit' },

  // 紧贴元素边缘
  { rect: '#basic-submit', padding: false },

  // 不传 rect：只有全屏遮罩
  {},
]

const code = `import { FreeRoam, FreeRoamTip } from '@caroundsky/free-roam'

const steps = [
  { rect: '#basic-submit' },                   // 默认外扩一圈
  { rect: '#basic-submit', padding: false },   // 紧贴边缘
  {},                                          // 全屏遮罩
]

<FreeRoam :steps="steps">
  <template #step-0="{ ctx }">
    <!-- 自动定位 + 自动翻转 + 指向挖洞的箭头 -->
    <FreeRoamTip :ctx="ctx">
      <p class="fr-tip__title">提交按钮</p>
      <button @click="ctx.next()">下一步</button>
    </FreeRoamTip>
  </template>
</FreeRoam>`
</script>
