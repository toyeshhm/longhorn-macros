import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Longhorn Macros',
        short_name: 'Macros',
        start_url: '/',
        display: 'standalone',
        theme_color: '#BF5700',
        background_color: '#111111',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // App shell only. The UT feed is deliberately not runtime-cached here: the app keeps its own last-good copy in
      // IndexedDB and must see the network failure to show the "menu saved N ago" banner (a SW cache would mask it).
      workbox: { navigateFallback: '/index.html' },
    }),
  ],
})
