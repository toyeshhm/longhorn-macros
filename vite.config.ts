import { defineConfig, type Plugin } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import { PRESS_IDS, PRESSES } from './src/theme'

const manifest: Partial<ManifestOptions> = {
  name: 'Longhorn Macros',
  short_name: 'Macros',
  start_url: '/',
  display: 'standalone',
  theme_color: PRESSES.day.paper,
  background_color: PRESSES.day.paper,
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

/**
 * One manifest per press, off the same table. The OS reads the manifest's own colours at install time and paints
 * the standalone splash from them before the document exists, so `<meta name="theme-color">` cannot reach them:
 * with one manifest every reader got a full screen of day cream ahead of a navy app at every cold launch.
 * `src/ui/theme.ts` points the document's manifest link at the running press's copy.
 */
function pressManifests(): Plugin {
  return {
    name: 'press-manifests',
    generateBundle() {
      for (const id of PRESS_IDS) {
        this.emitFile({
          type: 'asset',
          fileName: `manifest-${id}.webmanifest`,
          source: JSON.stringify({ ...manifest, theme_color: PRESSES[id].paper, background_color: PRESSES[id].paper }),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'fonts/*.woff2'],
      manifest,
      // App shell only. The UT feed is deliberately not runtime-cached here: the app keeps its own last-good copy in
      // IndexedDB and must see the network failure to show the "menu saved N ago" banner (a SW cache would mask it).
      workbox: { navigateFallback: '/index.html' },
    }),
    pressManifests(),
  ],
})
