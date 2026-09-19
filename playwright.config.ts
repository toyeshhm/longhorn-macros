import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npx vite --port 5199 --mode test', port: 5199, reuseExistingServer: true },
  use: { ...devices['iPhone 13'], browserName: 'chromium', baseURL: 'http://localhost:5199' },
})
