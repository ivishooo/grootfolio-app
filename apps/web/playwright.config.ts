import { defineConfig, devices } from '@playwright/test'

/**
 * Tests E2E de la web (GF-233). Playwright levanta el dev server de Vite; el
 * backend (API) debe estar corriendo aparte en VITE_API_URL (default
 * http://localhost:3333) con la DB migrada y seedeada (usuario dev).
 *
 *   pnpm dev:api                       # en otra terminal (+ DB)
 *   pnpm --filter @grootfolio/web e2e
 */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  // Comparten el usuario dev y su estado; corremos en serie para evitar choques.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
