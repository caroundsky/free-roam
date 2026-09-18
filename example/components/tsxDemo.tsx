import { defineComponent, ref } from 'vue'
import { FreeRoam } from '@caroundsky/free-roam'
import type { StepContext, StepResolver } from '@caroundsky/free-roam'
import { tipBelow } from '../tip'

/** 在 tsx 里渲染一个提示气泡 */
const renderTip = (
  ctx: StepContext,
  title: string,
  body: string,
  actions: { label: string; handler: () => void }[]
) => (
  <div class="fr-tip" style={tipBelow(ctx)}>
    <p class="fr-tip__title">{title}</p>
    <p>{body}</p>
    <div class="fr-tip__actions">
      {actions.map((action) => (
        <button
          key={action.label}
          class={
            action.label === '上一步'
              ? 'mock-btn mock-btn--sm mock-btn--ghost'
              : 'mock-btn mock-btn--sm'
          }
          onClick={action.handler}
        >
          {action.label}
        </button>
      ))}
    </div>
  </div>
)

/**
 * 演示「函数式 steps + tsx」的写法。
 *
 * `steps` 直接传一个接收 (step, ctx) 的函数，内部用 switch case 组织每一步——
 * 这正是从原业务页面平移过来的写法，逻辑复杂时比数组式更顺手。
 */
export default defineComponent({
  name: 'TsxDemo',
  setup() {
    const guideRef = ref<InstanceType<typeof FreeRoam> | null>(null)

    const steps: StepResolver = (step, ctx) => {
      switch (step) {
        case 0:
          // ctx 提供命令式能力：这里给 body 加个类，离开本步时清掉
          ctx.addBodyClass('tsx-demo-highlight')
          return {
            rect: { target: '#tsx-table', offset: [-4, -4], radius: 8 },
            content: (context) =>
              renderTip(context, '① 函数式步骤', 'steps 传函数，用 switch case 组织每一步。', [
                { label: '下一步', handler: () => context.next() },
              ]),
            onLeave: () => ctx.removeBodyClass('tsx-demo-highlight'),
          }

        case 1:
          return {
            rect: { target: '#tsx-toolbar' },
            content: (context) =>
              renderTip(context, '② 用 tsx 写 content', 'content 返回 VNode，无需额外模板。', [
                { label: '上一步', handler: () => context.prev() },
                { label: '下一步', handler: () => context.next() },
              ]),
          }

        default:
          return {
            content: (context) =>
              renderTip(context, '③ 结束', 'switch case 的 default 分支收尾。', [
                { label: '上一步', handler: () => context.prev() },
                { label: '重新开始', handler: () => context.goTo(0) },
                { label: '结束', handler: () => context.exit() },
              ]),
          }
      }
    }

    return () => (
      <section class="scene">
        <div class="scene__head">
          <h2>函数式 steps + tsx</h2>
          <p>
            用 <code>switch case</code> 组织步骤、用 JSX 直接写 <code>content</code>，
            适合逻辑分支较多的场景。
          </p>
        </div>

        <div class="scene__stage scene__stage--top">
          <div id="tsx-toolbar" class="mock-nav">
            <span class="mock-nav__item">＋</span>
            <span class="mock-nav__item">⟳</span>
            <span class="mock-nav__item">⋯</span>
          </div>

          <table id="tsx-table" class="mock-table">
            <thead>
              <tr>
                <th>字段</th>
                <th>处理中心</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>销量</td>
                <td>巴西</td>
                <td>128</td>
              </tr>
              <tr>
                <td>预测销量</td>
                <td>波兰</td>
                <td>64</td>
              </tr>
              <tr>
                <td>库存保护</td>
                <td>德国</td>
                <td>32</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="scene__foot">
          <button class="scene__start" onClick={() => guideRef.value?.start()}>
            开始引导
          </button>
        </div>

        <pre class="scene__code">{CODE}</pre>

        <FreeRoam ref={guideRef} steps={steps} total={3} autoStart={false} />
      </section>
    )
  },
})

const CODE = `const steps: StepResolver = (step, ctx) => {
  switch (step) {
    case 0:
      ctx.addBodyClass('highlight')          // ctx 提供命令式能力
      return {
        rect: { target: '#tsx-table', offset: [-4, -4], radius: 8 },
        content: (c) => <div class="fr-tip">...</div>,   // 直接写 JSX
        onLeave: () => ctx.removeBodyClass('highlight'),
      }
    case 1:
      return { rect: '#tsx-toolbar', content: (c) => <div>...</div> }
    default:
      return { content: (c) => <div>收尾</div> }
  }
}

<FreeRoam :steps="steps" :total="3" />`
