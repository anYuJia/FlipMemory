import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 使用 injectManifest 策略，允许自定义 Service Worker
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',

      // 注册行为
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // 包含哪些资源
      includeAssets: ['favicon.ico', 'icons/*.png', 'fonts/*.woff2'],

      // PWA Manifest 配置
      manifest: {
        name: 'FlipMemory - 翻转记忆',
        short_name: 'FlipMemory',
        description: '翻转记忆 —— 用翻转卡片的方式，记录生活中的美好瞬间',
        theme_color: '#f97316',
        background_color: '#fef3e2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'productivity'],
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // injectManifest 配置
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },

      // 开发模式配置
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    // 代码分割优化
    rollupOptions: {
      output: {
        // 手动分割 chunks
        manualChunks: {
          // Vue 核心
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // UI 图标库
          'icons': ['lucide-vue-next'],
          // 工具库
          'utils': ['date-fns', 'axios'],
          // IndexedDB
          'idb': ['idb'],
        },
        // 优化 chunk 文件名
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || ''
          if (facadeModuleId.includes('views/')) {
            return 'views/[name]-[hash].js'
          }
          if (facadeModuleId.includes('components/')) {
            return 'components/[name]-[hash].js'
          }
          return 'chunks/[name]-[hash].js'
        },
        // 入口文件名
        entryFileNames: 'js/[name]-[hash].js',
        // 静态资源文件名
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) {
            return 'images/[name]-[hash][extname]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
            return 'fonts/[name]-[hash][extname]'
          }
          if (/\.css$/.test(name)) {
            return 'css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
    // 生成 sourcemap（生产环境可关闭）
    sourcemap: false,
  },
})
