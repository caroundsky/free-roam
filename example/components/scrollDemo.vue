<template>
  <section class="scene">
    <div class="scene__head">
      <h2>滚动定位</h2>
      <p>
        这一屏故意做得很长。目标不在视口内时，组件会<strong>自动滚动过去</strong>；
        滚动过程中挖洞跟着页面走，滚完再校正一次。
      </p>
      <p>
        同时，引导期间页面滚动是锁定的——试试鼠标滚轮，滚不动（<code>:lock-scroll="false"</code>
        可关）。自动滚动不受影响，因为它走的是程序化滚动。
      </p>
    </div>

    <div class="scroll-demo">
      <div id="scroll-top" class="scroll-demo__target">① 顶部目标（本来就在视口内）</div>

      <div class="scroll-demo__list">
        <div v-for="i in 12" :key="`a-${i}`" class="scroll-demo__row">列表占位 {{ i }}</div>
      </div>

      <div id="scroll-mid" class="scroll-demo__target">② 中部目标（要滚动才看得到）</div>

      <div class="scroll-demo__list">
        <div v-for="i in 12" :key="`b-${i}`" class="scroll-demo__row">列表占位 {{ i }}</div>
      </div>

      <div id="scroll-bottom" class="scroll-demo__target">③ 底部目标（要继续往下滚）</div>
    </div>

    <div class="scene__foot">
      <button class="scene__start" @click="guideRef?.start()">开始引导</button>
    </div>

    <pre class="scene__code">{{ code }}</pre>

    <FreeRoam ref="guideRef" :steps="steps" :total="3" :auto-start="false">
      <template #step-0="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">① 顶部目标</p>
          <p>它本来就在视口内，不会触发滚动。</p>
          <div class="fr-tip__actions">
            <button class="mock-btn mock-btn--sm" @click="ctx.next()">下一步</button>
          </div>
        </FreeRoamTip>
      </template>

      <template #step-1="{ ctx }">
        <FreeRoamTip :ctx="ctx">
          <p class="fr-tip__title">② 中部目标</p>
          <p>它在视口外——组件自动滚了过来。</p>
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
          <p class="fr-tip__title">③ 底部目标</p>
          <p>同样滚动到位。不想自动滚的话，给该步骤设 <code>:scroll-into-view="false"</code>。</p>
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
import { ref } from 'vue'
import { FreeRoam, FreeRoamTip } from '@caroundsky/free-roam'

defineOptions({ name: 'ScrollDemo' })

const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)

/** 三个目标依次向下，后两个都在初始视口之外 */
const steps = [{ rect: '#scroll-top' }, { rect: '#scroll-mid' }, { rect: '#scroll-bottom' }]

const code = `const steps = [
  { rect: '#scroll-top' },      // 在视口内，不滚动
  { rect: '#scroll-mid' },      // 视口外 → 自动滚过去
  { rect: '#scroll-bottom' },   // 继续往下滚
]

<FreeRoam :steps="steps" :total="3" />

<!-- 行为开关 -->
<FreeRoam :steps="steps" :total="3"
          :lock-scroll="true"        <!-- 默认：锁住用户滚动 -->
          :refresh-on-scroll="true"  <!-- 默认：滚动时挖洞跟着走（rAF 节流） -->
/>

// 单步关闭自动滚动
{ rect: '#somewhere', scrollIntoView: false }`
</script>

<style scoped lang="less">
.scroll-demo {
  margin: 20px 24px 0;
  overflow: hidden;
  border: 1px dashed #e0e3e8;
  border-radius: 8px;

  &__target {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 90px;
    font-size: 14px;
    font-weight: 600;
    color: #5a8cff;
    background: #eef3ff;
    border-top: 1px solid #c9d8ff;
    border-bottom: 1px solid #c9d8ff;
  }

  &__list {
    padding: 8px;
  }

  &__row {
    padding: 14px 16px;
    font-size: 13px;
    color: #8a9099;
    border-bottom: 1px dashed #f0f2f5;

    &:last-child {
      border-bottom: none;
    }
  }
}
</style>
