import { defineConfig } from '@playwright/test'

export default defineConfig({
  metadata: { logoDevConfigured: true },
  testDir: './tests', testMatch: 'company-logos.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5176', channel: 'chrome' },
  webServer: {
    command: 'npm run dev -- --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176', reuseExistingServer: false,
    env: { VITE_LOGO_DEV_PUBLISHABLE_KEY: 'pk_test_company_logos' },
  },
})
