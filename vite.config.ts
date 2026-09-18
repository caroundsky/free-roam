import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'

// https://vitejs.dev/config/
export default defineConfig({
  // 部署到 GitHub Pages 时站点在 /<repo>/ 子路径下，由 CI 传入 VITE_BASE；
  // 本地开发保持根路径
  base: process.env.VITE_BASE ?? '/',

  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      imports: ['vue'],
      dts: 'types/auto-import.d.ts',
    }),
  ],

  resolve: {
    alias: {
      // 组件本体就在 src/ 下，示例里以包名引入，等价于真实的消费方式
      '@caroundsky/free-roam': '/src',
      '@': '/src',
      '~': './',
    },
  },

  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
      },
    },
  },

  server: {
    port: 8080, // 指定端口号
    strictPort: false, // 设为 false 时，若端口已被占用则会尝试下一个可用端口,而不是直接退出
  },
})
