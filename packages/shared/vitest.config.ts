/**
 * Los tests viven en `src`. Hace falta decirlo explícitamente porque este
 * paquete se compila a `dist/`, y desde vitest 4 el patrón por defecto también
 * levanta `dist/**\/*.test.js`: corría cada test dos veces, una de ellas contra
 * un build que puede estar viejo.
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
  },
})
