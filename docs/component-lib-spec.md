# 单组件库代码结构规范

> 适用范围：以**一个组件**为核心的库项目（Vue 3 + Vite）。
> 本文是指令式规范，可直接作为 AI 编码约束注入；内容经实际项目验证。

---

## 一、目录结构（强制）

```text
<project>/
├── src/                        # ★ 组件本体，唯一职责
│   ├── index.ts                # 包入口：组件 + 工具函数 + 类型
│   ├── <ComponentName>.vue     # 主组件（渲染层）
│   ├── <SubPart>.tsx           # 私有子组件，直接平铺
│   ├── core/                   # 框架无关的纯逻辑
│   ├── composables/            # 框架适配层
│   └── style/                  # 组件样式
│
├── example/                    # ★ 演示环境，与组件源码彻底分离
│   ├── App.vue                 # 演示容器 + 全局样式
│   ├── main.ts                 # 演示入口
│   ├── demo.less               # 演示共享样式
│   ├── <shared>.ts             # 演示共享工具
│   ├── assets/                 # 演示用资源（图片等）
│   └── components/             # 各演示场景
│       ├── basicDemo.vue
│       ├── advancedDemo.vue
│       └── ...
│
├── docs/                       # 设计文档
├── index.html                  # 指向 example/main.ts
├── env.d.ts                    # Vite 类型声明（放根目录，不放 src）
├── vite.config.ts              # 应用（示例）构建
├── vite.lib.config.ts          # 库构建
├── tsconfig.json
├── tsconfig.node.json
└── package.json
```

### 布局规则

1. **`src/` 下不出现 `views`、`components` 等中间层**——组件本体就在 `src/` 根。
   （`src/components/<lib>/` 这种写法会让路径多一层无意义的嵌套）

2. **演示环境独立在根目录 `example/`**，不混进 `src/`。

   理由：让 `src/` 只包含「要发布的东西」；演示专属的依赖（图片、第三方 UI 库）不会被打进库产物。

3. **私有子组件平铺在 `src/` 根**，不另建 `components/` 子目录。
   单组件库的子组件通常只有几个，且都是实现细节，平铺比藏一层更直观。

4. **组件内不内置任何图片资源**。
   理由：Vite lib 构建会把所有资源**内联为 base64**（见第七章），内置资源会让包体积失控。资源应由使用方传入。

---

## 二、`core/` 的硬约束

`core/` 存放与框架无关的纯逻辑（类型定义、DOM 工具、算法、状态机）。

**必须满足**：

- 不出现任何 `import ... from 'vue'`（或 React 等框架）
- 不使用无法 polyfill 的语言特性

**目的**：将来产出「框架无关」的第二形态（UMD 包、原生 JS 版本）时，`core/` 能原样复用，只需重写渲染层。

把这条写进代码注释或 lint 规则里，避免后续维护时被无意破坏。

---

## 三、引入方式：示例用包名

示例文件里**用包名引入组件**，与组件发布后使用者的写法完全一致：

```ts
import { ComponentName, helperFn } from '<lib-name>'
```

配套两处映射，**都不需要预先构建**即可开发调试：

```ts
// vite.config.ts
resolve: {
  alias: {
    '<lib-name>': '/src',
    '@': '/src',
    '~': './',
  },
},
```

```jsonc
// tsconfig.json
"paths": {
  "<lib-name>": ["./src/index.ts"],
  "@/*": ["./src/*"],
  "~/*": ["./*"]
}
```

**不要**让示例写成 `@/components/<lib>` 这类内部路径——那样示例就失去了「演示真实消费方式」的价值。

---

## 四、包入口约定

`src/index.ts` 的规则：

1. **只提供具名导出，不设 `export default`**

   理由：具名 + default 混用时，打包器会警告 `MIXED_EXPORTS`，且 UMD 产物会变成 `window.<Lib>.default`，而使用者期望的是 `window.<Lib>` 直接可用。
   不设 default 后，UMD 产物恰好是 `window.<Lib>.{ ComponentName, helperFn, ... }`。

2. **导出面要克制**：只导出「组件本体」+「写配置时确实会调用的那一两个函数」+ 公共类型。

   内部实现（求值器、状态机、DOM 工具集）即使看起来有用也不要导出——一旦导出就成了公开 API，从此不能随便改。
   判断标准：**使用者不 import 它就没法写配置吗？** 不是的话就别导出。

3. **不导出 `install`**，只把它挂在组件对象上：

   ```ts
   const install = (app: App): void => {
     app.component('ComponentName', ComponentName)
   }

   Object.assign(ComponentName, { install })
   ```

   使用者写 `app.use(ComponentName)` 就够了，`import { install }` 属于多余入口。

4. **生成 `.d.ts` 并配好 `types` 字段**：使用者靠它拿到配置类型，而不是靠一个「类型辅助函数」。

   ```jsonc
   // tsconfig.lib.json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "declaration": true,
       "emitDeclarationOnly": true,
       "outDir": "dist-lib"
     },
     "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
   }
   ```

   ```jsonc
   // package.json
   "types": "./dist-lib/index.d.ts",
   "exports": {
     ".": {
       "types": "./dist-lib/index.d.ts",
       "import": "./dist-lib/<lib-name>.es.js",
       "require": "./dist-lib/<lib-name>.umd.js"
     }
   }
   ```

   > 反例：为了让配置字面量拿到类型上下文而导出一个恒等函数（`defineSteps` 之类）。
   > 使用者标一行 `const steps: StepConfig[] = [...]` 就能达到同样效果，还少学一个 API；
   > 而且有了 `.d.ts`，`StepConfig` 本身就能从包里 import 到。

---

## 五、构建配置

需要**两个** Vite 配置文件，职责分离：

| 文件 | 用途 |
| --- | --- |
| `vite.config.ts` | 构建演示应用（默认入口 `index.html` → `example/main.ts`） |
| `vite.lib.config.ts` | 构建库产物（ES Module + UMD） |

库构建的关键配置：

```ts
export default defineConfig({
  publicDir: false, // 库不需要拷贝 public
  plugins: [vue(), vueJsx()],
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      name: '<LibName>', // UMD 全局变量名
      formats: ['es', 'umd'],
      fileName: (format) => `<lib-name>.${format}.js`,
    },
    rollupOptions: {
      external: ['vue'], // 框架作为 peer 依赖外置
      output: {
        globals: { vue: 'Vue' },
        assetFileNames: '<lib-name>.[ext]',
      },
    },
  },
})
```

`package.json` 配套：

```jsonc
{
  "main": "./dist-lib/<lib-name>.umd.js",
  "module": "./dist-lib/<lib-name>.es.js",
  "exports": {
    ".": {
      "import": "./dist-lib/<lib-name>.es.js",
      "require": "./dist-lib/<lib-name>.umd.js"
    },
    "./style.css": "./dist-lib/<lib-name>.css"
  },
  "files": ["dist-lib"],
  "sideEffects": ["*.css", "*.less", "*.vue"],
  "scripts": {
    "build:lib": "vue-tsc --noEmit && vite build --config vite.lib.config.ts"
  }
}
```

构建产物目录（`dist-lib`）要写进 `.gitignore`。

---

## 六、样式约定

1. **所有内部类名加统一前缀**（如 `<abbr>-`），避免与宿主页面冲突。
   前缀取自库名缩写，例如 `free-roam` → `fr-`。

2. **不稳定的视觉值走 CSS 变量**暴露，使用者可在自己的样式里覆盖：

   ```css
   .fr-guide {
     --fr-primary: #5a8cff;
     --fr-z-index: 9999;
   }
   ```

3. **常用项同时提供 props 快捷方式**，但 props **默认值留空**——只在显式传入时才写内联样式，否则会盖掉使用者的 CSS 变量覆盖。

4. **不使用 `scoped`**。
   组件要渲染使用者传入的 VNode/插槽内容，`scoped` 对它不生效，反而造成「容器样式生效、内容样式不生效」的困惑。统一靠前缀避让。

5. **组件内不写任何宿主元素样式**。
   需要联动宿主时，暴露一个「加类名」的能力（如 `ctx.addBodyClass()`），由使用者写自己的 CSS。

---

## 七、已知坑（Vite 8 / Rolldown）

Vite 8 底层已从 Rollup 换成 Rolldown，lib 构建行为与旧版本有差异：

| 现象 | 影响 |
| --- | --- |
| **资源全部内联为 base64**（无论文件大小），不产出独立资源文件 | 组件内不能放图片 |
| **动态使用 `import.meta.url` 编译为 `{}.url`**（即 `undefined`） | 组件不靠它解析资源路径（`new URL('./x.png', import.meta.url)` 这类**静态形式**会被编译期求值，正常可用） |
| **不做语法降级**，产物保留 `?.` / `??` / 箭头函数 | 目标环境限定为现代浏览器 |
| 具名 + default 混用会触发 `MIXED_EXPORTS` 警告 | 见第四章：不设 default |

另外：`.env.*` 文件里**不要写 `NODE_ENV`**（除 `development`），Vite 会警告。

---

## 八、第三方依赖

**能借力就借力**：定位、拖拽、虚拟滚动这类「边界情况极多」的能力，优先用成熟库而不是自己写。

选型标准：

1. **框架无关**——能放进 `core/`，第二形态（UMD / 原生）直接复用。
   例如定位要选 `@floating-ui/dom` 而不是 `@floating-ui/vue`。
2. **体积与依赖可控**——无传递依赖，gzip 后个位数 kB。
3. **支持虚拟元素**——参考物常常不是真实 DOM（如「挖洞区域的包围盒」），库要能接受 `VirtualElement` 这类抽象。

**打进产物，而不是 external**：框架无关的工具库直接内联进产物，让 `<script>` 使用者无需额外引入依赖；只有框架本身（Vue）才 external 成 peer dependency。

> 反例：为了「零依赖」而手写 popover 定位——翻转、边界收敛、箭头跟随、滚动容器、`transform` 祖先，每一项都是坑，投入产出比极低。

---

## 九、文档约定

| 文件 | 面向 | 内容 |
| --- | --- | --- |
| `README.md` | 使用者 | 一句话定位、特性、快速开始、用法示例、API 表、构建说明、目录说明 |
| `docs/<lib>-spec.md` | 维护者 | 设计决策、关键取舍、构建实测结论 |

`README.md` 的要点：

- **示例代码必须可直接复制运行**（不要写伪代码或省略号）
- 把「为什么提供这个辅助函数」「某个 API 看起来怪是为什么」讲清楚——使用者踩过一次的坑就是文档该写的地方
- API 用表格罗列，签名准确

---

## 十、验收标准

组件完成后，用它在 `example/` 中**重写一个真实业务场景**。

判定标准：**若原有业务逻辑无法平移到新 API（除样式类名外无需改动），说明抽象不到位**。

只跑通几个精心构造的 demo 不算数——真实业务里那些「奇怪的偏移量」「运行时插入的 DOM」「宿主样式联动」才是抽象的试金石。
