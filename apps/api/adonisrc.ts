import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  /**
   * Comandos cargados por ace. Cada entrada es un import dinamico que
   * registra los subcomandos del paquete correspondiente.
   */
  commands: [
    () => import('@adonisjs/core/commands'),
    () => import('@adonisjs/lucid/commands'),
  ],

  /**
   * Service providers que arrancan junto con la aplicacion.
   */
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl', 'test'],
    },
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/core/providers/vinejs_provider'),
    {
      file: () => import('#providers/price_refresh_provider'),
      environment: ['web'],
    },
  ],

  /**
   * Archivos que se importan en orden durante el boot.
   */
  preloads: [
    () => import('#start/kernel'),
    () => import('#start/validator'),
    () => import('#start/routes'),
  ],

  /**
   * Archivos que se copian durante `node ace build`.
   */
  metaFiles: [],

  /**
   * Configuracion de tests (Japa). Las suites se completan en GF-205+.
   */
  tests: {
    suites: [],
    forceExit: false,
  },
})
