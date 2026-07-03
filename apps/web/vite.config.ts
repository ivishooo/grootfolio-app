import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Los specs E2E corren con Playwright (pnpm e2e), no con Vitest. Sin esto,
    // Vitest los levanta y rompe con "did not expect test() to be called here".
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
