import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path'



// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 根據當前模式 (development/production) 載入 .env 檔案
  // 第三個參數 '' 代表載入所有變數，而不僅僅是 VITE_ 開頭的
  const env = loadEnv(mode, process.cwd(), '');
  console.log('開發模式:', env.DEV)
  console.log('VITE_BACKEND_URL:', env.VITE_BACKEND_URL)

  // 子路徑設定：透過環境變數注入，預設 '/' 讓本機開發不受影響
  // 整合部署時由 Dockerfile build arg 傳入 VITE_BASE_PATH=/forma/
  const basePath = env.VITE_BASE_PATH || '/';

  return {
  base: basePath,
  plugins: [
      react(),
   tailwindcss(),
   VitePWA({
     registerType: 'autoUpdate',
     includeAssets: ['icons/*.svg'],
     manifest: {
       name: 'Forma 表單系統',
       short_name: 'Forma',
       description: 'Forma — 專業表單管理與資料收集平台',
       theme_color: '#1976d2',
       background_color: '#ffffff',
       display: 'standalone',
       start_url: basePath,
       icons: [
         {
           src: 'icons/icon-192.svg',
           sizes: '192x192',
           type: 'image/svg+xml',
         },
         {
           src: 'icons/icon-512.svg',
           sizes: '512x512',
           type: 'image/svg+xml',
           purpose: 'any maskable',
         },
       ],
     },
     workbox: {
       maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
       navigateFallback: 'index.html',
       navigateFallbackDenylist: [/^\/api\//],
       runtimeCaching: [
         {
           urlPattern: /\/api\/forms\/.*/,
           handler: 'NetworkFirst',
           options: {
             cacheName: 'forms-cache',
             expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
           },
         },
         {
           urlPattern: /\/api\/submissions.*/,
           handler: 'NetworkFirst',
           options: {
             cacheName: 'submissions-cache',
             expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
           },
         },
         {
           urlPattern: /\/api\/.*/,
           handler: 'NetworkFirst',
           options: {
             cacheName: 'api-cache',
             expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
           },
         },
       ],
     },
   }),
  ],
  resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        }
      },
    },
  }
}
)
