import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Maskable and Apple icons are full-bleed: orange to the edge (the M sits inside the 80% safe zone), not the preset's padded white.
export default defineConfig({
  preset: { ...minimal2023Preset, maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#BF5700' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#BF5700' } } },
  images: ['public/logo.svg'],
})
