import { defineConfig, devices } from '@playwright/test'

const phone = { ...devices['iPhone 13'], browserName: 'chromium' } as const

export default defineConfig({
  testDir: 'e2e',
  webServer: [
    { command: 'npx vite --port 5199 --mode test', port: 5199, reuseExistingServer: true },
    // The service worker only exists in a production build, so the offline spec runs against `vite preview`; always rebuilt.
    { command: 'npx vite build --mode test && npx vite preview --port 5198', port: 5198, reuseExistingServer: false },
  ],
  projects: [
    { name: 'dev', testIgnore: 'offline.spec.ts', use: { ...phone, baseURL: 'http://localhost:5199' } },
    { name: 'pwa', testMatch: 'offline.spec.ts', use: { ...phone, baseURL: 'http://localhost:5198' } },
  ],
})
