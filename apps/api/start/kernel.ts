/**
 * Kernel - registro de middlewares globales y nombrados.
 *
 * - server-level middleware (cors, body parser): se agregan en Fase 2 cuando
 *   instalemos los paquetes correspondientes con `node ace add @adonisjs/cors`.
 * - middleware nombrado: se referencia desde rutas via `middleware.auth()`.
 */
import router from '@adonisjs/core/services/router'

export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
})
