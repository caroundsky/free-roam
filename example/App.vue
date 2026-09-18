<template>
  <div class="demo">
    <header class="demo__header">
      <h1 class="demo__title">free-roam</h1>
      <p class="demo__subtitle">通用漫游引导组件 · Vue 3</p>
    </header>

    <nav class="demo__tabs">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="demo__tab"
        :class="{ 'demo__tab--active': activeKey === item.key }"
        @click="switchTab(item.key)"
      >
        {{ item.label }}
      </button>
    </nav>

    <main class="demo__body">
      <KeepAlive>
        <component :is="current" />
      </KeepAlive>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import basicDemo from './components/basicDemo.vue'
import advancedDemo from './components/advancedDemo.vue'
import tsxDemo from './components/tsxDemo'
import businessDemo from './components/businessDemo.vue'
import scrollDemo from './components/scrollDemo.vue'

defineOptions({ name: 'ExampleApp' })

const tabs = [
  { key: 'basic', label: '基础用法', comp: basicDemo },
  { key: 'advanced', label: '进阶用法', comp: advancedDemo },
  { key: 'tsx', label: '函数式 + TSX', comp: tsxDemo },
  { key: 'scroll', label: '滚动定位', comp: scrollDemo },
  { key: 'business', label: '业务回归', comp: businessDemo },
]

const activeKey = ref(tabs[0].key)
const current = computed(() => tabs.find((item) => item.key === activeKey.value)?.comp)

/** 各场景高度差异很大，切换时把页面拉回顶部，免得停在半截 */
const switchTab = (key: string) => {
  activeKey.value = key
  window.scrollTo({ top: 0 })
}
</script>

<style lang="less">
@import './demo.less';

html,
body {
  padding: 0;
  margin: 0;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
