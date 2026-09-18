import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

/**
 * 组件库构建配置（产出 ES Module + UMD 两种格式）
 *
 * - `free-roam.es.js`  供现代打包器 `import`
 * - `free-roam.umd.js` 供 `<script>` 直接引入，暴露全局 `FreeRoam`
 *
 * Vue 作为 peer 依赖外置（不打进产物）：UMD 版本依赖页面上的全局 `Vue`。
 *
 * 注意（Vite 8 / Rolldown 实测结论）：
 * 1. lib 构建会把所有资源内联为 base64，不产出独立资源文件，
 *    所以组件内不要放图片等资源，否则包体积失控
 * 2. 动态使用 `import.meta.url` 在 UMD 产物中会变成 `undefined`
 */
export default defineConfig({
  publicDir: false,
  plugins: [vue(), vueJsx()],

  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    cssCodeSplit: false,

    lib: {
      entry: 'src/index.ts',
      name: 'FreeRoam',
      formats: ['es', 'umd'],
      fileName: (format) => `free-roam.${format}.js`,
    },

    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
        assetFileNames: 'free-roam.[ext]',
      },
    },
  },
})
