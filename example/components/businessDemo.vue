<template>
  <section class="scene">
    <div class="scene__head">
      <h2>业务回归验证</h2>
      <p>
        用 <code>FreeRoam</code> 复刻原业务页面的引导流程，覆盖：函数式
        <code>switch case</code>、运行时插入的示意图作为挖洞目标、
        <code>body</code> 类名联动宿主样式、多洞、以及退出提示屏。
      </p>
    </div>

    <div class="scene__stage scene__stage--top">
      <!-- ↓↓↓ 模拟的业务页面（引导要指着它们） ↓↓↓ -->
      <div class="biz">
        <div class="biz__toolbar">
          <span class="biz__title">销售库存</span>
          <div class="mock-nav">
            <span class="mock-nav__item" title="按处理中心查看">
              <svg name="guide" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
              </svg>
            </span>
            <span class="mock-nav__item" title="汇总查看">
              <svg name="more" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z" />
              </svg>
            </span>
          </div>
          <span class="mock-nav__item biz__help" title="使用指引" @click="guideRef?.start()"
            >?</span
          >
        </div>

        <div class="biz__filter">
          <input class="mock-input" placeholder="SKU" />
          <select class="mock-input biz__select">
            <option>全部处理中心</option>
          </select>
          <button class="mock-btn mock-btn--sm">查询</button>
          <span class="biz__filter-extra">
            <input class="mock-input" placeholder="库存下限" />
            <input class="mock-input" placeholder="库存上限" />
          </span>
        </div>

        <div class="biz__body">
          <div class="biz__fields">
            <div class="biz__field biz__field--head">
              <span>销量</span>
              <span class="biz__field-opeate">＋ ▾</span>
            </div>
            <div class="biz__field">
              <span>海外仓销量</span>
              <span class="biz__field-opeate">✎ 🗑</span>
            </div>
            <div class="biz__field">
              <span>海外仓销量demo1</span>
              <span class="biz__field-opeate">✎ 🗑</span>
            </div>
            <div class="biz__field">
              <span>预测销量</span>
              <span class="biz__field-opeate">＋</span>
            </div>
            <div class="biz__field">
              <span>开发平台库存</span>
              <span class="biz__field-opeate">＋</span>
            </div>
          </div>

          <div class="biz__config">
            <div class="biz__config-head">已选处理中心</div>
            <div class="biz__config-row">阿拉伯联合酋长国 · 阿联酋迪拜退件处理中心</div>
            <div class="biz__config-row">巴西 · 巴西处理中心</div>
            <div class="biz__config-actions">
              <button class="mock-btn mock-btn--sm mock-btn--ghost">重置</button>
              <button id="biz-save" class="mock-btn mock-btn--sm">保存配置</button>
            </div>
          </div>
        </div>

        <div class="biz__stock">
          <span id="check-stock" class="biz__stock-label">校对库存</span>
          <input id="SKU-POA" class="mock-input" placeholder="SKU / POA" />
          <input id="process-center" class="mock-input" placeholder="处理中心" />
          <button class="mock-btn mock-btn--sm">获取最新库存</button>
        </div>
      </div>
      <!-- ↑↑↑ 模拟的业务页面结束 ↑↑↑ -->
    </div>

    <div class="scene__foot">
      <button class="scene__start" @click="guideRef?.start()">开始引导</button>
    </div>

    <FreeRoam
      ref="guideRef"
      :steps="steps"
      :total="7"
      :auto-start="false"
      @exit="onExit"
      @finish="onFinish"
    />
  </section>
</template>

<script setup lang="tsx">
import { ref } from 'vue'
import { FreeRoam, FreeRoamTip, imgLoad, resolveSafe } from '@caroundsky/free-roam'
import type { StepContext, StepResolver } from '@caroundsky/free-roam'
import panelSrc from '../assets/guide-custom.png'

defineOptions({ name: 'BusinessDemo' })

const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)

// 引导完成标记：原实现用 localStorage，这里用内存变量演示
const hasGuided = ref(false)

/**
 * 「自定义字段配置」示意图。
 * 原实现就是运行时把它插进 body，再以它为基准算挖洞坐标——
 * 这正是 `resolveTargetPosition(img)` 那类用法的典型场景。
 */
const panel = ref<HTMLImageElement | null>(null)

const ensurePanel = async () => {
  if (!panel.value) {
    const img = document.createElement('img')
    img.src = panelSrc
    img.className = 'biz-panel'
    document.body.appendChild(img)
    panel.value = img
  }

  // 必须等图片加载完，否则量出来的位置和尺寸都是错的
  await imgLoad(panel.value)

  return panel.value
}

const removePanel = () => {
  panel.value?.remove()
  panel.value = null
}

/** 退出提示屏的步骤号 */
const EXIT_TIP_STEP = 6

/** 气泡：用 FreeRoamTip 自动定位（含翻转与指向挖洞的箭头） */
const tip = (ctx: StepContext, title: string, body: string) => (
  <FreeRoamTip ctx={ctx} class="biz-tip">
    <p class="fr-tip__title">
      {title}
      {/* 点 ✕ 不是直接退出，而是跳到「退出提示屏」——用普通步骤 + goTo 实现 */}
      <span class="biz-tip__close" onClick={() => ctx.goTo(EXIT_TIP_STEP)}>
        ✕
      </span>
    </p>
    <p>{body}</p>
    <div class="fr-tip__actions">
      <button class="mock-btn mock-btn--sm mock-btn--ghost" onClick={() => ctx.prev()}>
        上一步
      </button>
      <button class="mock-btn mock-btn--sm" onClick={() => ctx.next()}>
        下一步
      </button>
    </div>
  </FreeRoamTip>
)

/**
 * 步骤配置：与原 home.vue 的 setStep 同构——一个函数 + switch case。
 * 数组形态表达不了「退出提示屏」这类不连续的步骤，所以这里用命令式写法。
 */
const steps: StepResolver = (step, ctx) => {
  switch (step) {
    // ① 切换查看模式
    case 0: {
      return {
        rect: '.mock-nav__item',
        content: (c) =>
          tip(
            c,
            '1 / 7　切换查看模式',
            '切换至网格图标，可按处理中心查看进销库存；切换至列表图标，查看汇总数量。'
          ),
      }
    }

    // ② 新增 / 编辑 / 删除字段（目标是运行时插入的示意图）
    // 需要示意图的步骤都自己 ensurePanel + onLeave 清理：
    // 步骤可以来回切，谁都不能假设「上一步已经把它准备好了」
    case 1:
      return {
        waitFor: ensurePanel,
        onLeave: removePanel,
        rect: () => {
          const el = panel.value
          if (!el) return []
          const { left, top } = resolveSafe(el)
          return [
            { left: left + 20, top: top + 66, width: 215, height: 30, radius: 0 },
            { left: left + 20, top: top + 156, width: 215, height: 30, radius: 0 },
          ]
        },
        content: (c) =>
          tip(
            c,
            '2 / 7　新增/编辑/删除字段',
            '点击 ＋ 添加子级字段，点击 ✎ 改名，点击 🗑 删除子级。'
          ),
      }

    // ③ 配置处理中心（示意图上的两个区域）
    case 2:
      return {
        waitFor: ensurePanel,
        onLeave: removePanel,
        rect: () => {
          const el = panel.value
          if (!el) return []
          const { left, top } = resolveSafe(el)
          return [
            { left: left + 10, top: top + 66, width: 240, height: 180, radius: 0 },
            { left: left + 281, top: top + 130, width: 429, height: 140, radius: 0 },
          ]
        },
        content: (c) =>
          tip(c, '3 / 7　配置处理中心', 'A. 可选择单个或多选字段；B. 据此配置处理中心。'),
      }

    // ④ 保存配置：顺带用 body 类名联动宿主样式
    case 3:
      ctx.addBodyClass('biz-highlight-save')
      return {
        waitFor: ensurePanel,
        rect: () => {
          const el = panel.value
          if (!el) return []
          const { left, top } = resolveSafe(el)
          return { left: left + 731, top: top + 603, width: 348, height: 31, radius: 0 }
        },
        content: (c) => tip(c, '4 / 7　保存配置', '配置完成，别忘记保存哦！'),
        onLeave: () => {
          ctx.removeBodyClass('biz-highlight-save')
          removePanel()
        },
      }

    // ⑤ 校对库存：一次挖三个洞，并把宿主搜索栏展开
    case 4:
      ctx.addBodyClass('biz-filter-expanded')
      return {
        rect: () => ['#check-stock', '#SKU-POA', '#process-center'],
        content: (c) =>
          tip(c, '5 / 7　校对库存', '仓储库存偶有遗漏，输入 SKU 与处理中心即可获取最新数量。'),
        onLeave: () => ctx.removeBodyClass('biz-filter-expanded'),
      }

    // ⑥ 收尾
    case 5:
      return {
        content: (c) => tip(c, '6 / 7　完成', '引导到此结束，随时点击右上角的 ? 重新观看。'),
      }

    // ⑦ 退出提示屏：由气泡上的 ✕ 调用 goTo 跳过来
    case 6: {
      return {
        rect: '.biz__help',
        content: (c) => (
          <FreeRoamTip ctx={c} class="biz-tip">
            <p class="fr-tip__title">在这里可以再次观看指引哦！</p>
            <div class="fr-tip__actions">
              <button
                class="mock-btn mock-btn--sm"
                onClick={() => {
                  hasGuided.value = true
                  c.exit()
                }}
              >
                我知道了
              </button>
            </div>
          </FreeRoamTip>
        ),
      }
    }

    default:
      return {}
  }
}

const onExit = () => {
  // 退出时兜底清理（正常情况下 onLeave 已经处理过）
  removePanel()
  document.body.classList.remove('biz-highlight-save', 'biz-filter-expanded')
}

const onFinish = () => {
  hasGuided.value = true
}
</script>

<style scoped lang="less">
// 模拟业务页面的外观
.biz {
  overflow: hidden;
  font-size: 13px;
  color: #4a5058;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;

  &__toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid #eef0f3;
  }

  &__title {
    margin-right: auto;
    font-size: 14px;
    font-weight: 600;
    color: #1f2329;
  }

  &__help {
    color: #8a9099;
  }

  &__filter {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #eef0f3;

    .mock-input {
      width: 130px;
      font-size: 13px;
    }

    // 平时隐藏的两个筛选项，由引导展开
    .biz__filter-extra {
      display: none;
      gap: 8px;
    }
  }

  &__select {
    width: 150px !important;
  }

  &__body {
    display: flex;
    min-height: 220px;
  }

  &__fields {
    width: 220px;
    padding: 8px;
    border-right: 1px solid #eef0f3;
  }

  &__field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 6px;

    &--head {
      font-weight: 600;
      color: #1f2329;
      background: #f2f4f7;
    }

    &-opeate {
      font-size: 12px;
      color: #b0b6bf;
    }
  }

  &__config {
    flex: 1;
    padding: 8px 16px;

    &-head {
      padding: 8px 0;
      font-weight: 600;
      color: #1f2329;
    }

    &-row {
      padding: 9px 0;
      color: #646a73;
      border-bottom: 1px dashed #f0f2f5;
    }

    &-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }
  }

  &__stock {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px 16px;
    background: #fafbfc;
    border-top: 1px solid #eef0f3;

    .mock-input {
      width: 160px;
      font-size: 13px;
    }
  }

  &__stock-label {
    padding: 6px 13px;
    font-weight: 500;
    color: #1f2329;
    background: #fff;
    border: 1px solid #e8eaed;
    border-radius: 6px;
  }
}
</style>
