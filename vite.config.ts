import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Healthcare/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Health Coach',
        short_name: 'Coach',
        description: 'Coach sportif personnalisé',
        start_url: '/Healthcare/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
          { src: '/Healthcare/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/Healthcare/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip waiting to activate new service worker immediately
        skipWaiting: true,
        clientsClaim: true,
        // Cache strategies for different asset types
        runtimeCaching: [
          {
            // HTML files: network-first to always get latest version
            urlPattern: /\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
          {
            // Static assets: cache-first for performance
            urlPattern: /\.(js|css|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
