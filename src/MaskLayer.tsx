import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { RectCoordinate } from './core/types'

/**
 * 遮罩层：用 SVG mask 挖洞。
 *
 * mask 的规则是「白色可见、黑色透明」——
 * 铺满的白色 rect 让整层暗色遮罩显现，rects 里的黑色 rect 把暗色抠掉，露出底下的页面。
 *
 * 遮罩颜色不在此处以属性写死，而是交给 CSS 变量 `--fr-mask-color`，
 * 这样既支持组件的 maskColor prop，也支持使用者在样式里覆盖。
 */
export default defineComponent({
  name: 'FrMaskLayer',
  props: {
    maskId: { type: String, required: true },
    rects: { type: Array as PropType<RectCoordinate[]>, default: () => [] },
  },
  setup(props) {
    return () => (
      <svg class="fr-guide__mask" width="100vw" height="100vh">
        <defs>
          <mask id={props.maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {props.rects.map((item, index) => (
              <rect
                key={index}
                x={item.left}
                y={item.top}
                rx={item.radius}
                width={item.width}
                height={item.height}
                fill="#000"
              />
            ))}
          </mask>
        </defs>
        <rect
          class="fr-guide__mask-bg"
          x="0"
          y="0"
          width="100%"
          height="100%"
          style={{ mask: `url(#${props.maskId})`, WebkitMask: `url(#${props.maskId})` }}
        />
      </svg>
    )
  },
})
