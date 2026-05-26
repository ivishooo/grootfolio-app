/**
 * Kernel - registro de middlewares globales y nombrados.
 *
 * Globales: corren en cada request (orden = orden del array).
 * Nombrados: se referencian desde rutas via `middleware.auth()`.
 */
import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

// Handler global de excepciones: serializa errores al shape ApiError (GF-215).
server.errorHandler(() => import('#exceptions/handler'))

server.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
})
