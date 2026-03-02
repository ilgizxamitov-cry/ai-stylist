import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      
      // ВОТ ЭТА НОВАЯ НАСТРОЙКА СПАСЕТ СБОРКУ
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000, // Увеличиваем лимит до 30 МБ
      },

      manifest: {
        name: 'AI Stylist Pro',
        short_name: 'Stylist',
        description: 'Ваш умный гардероб и ИИ-стилист в кармане',
        theme_color: '#0b0c10',
        background_color: '#0b0c10',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})