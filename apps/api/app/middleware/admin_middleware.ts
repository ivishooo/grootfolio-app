/**
 * Admin middleware (F1). Corre DESPUÉS de `auth` (que deja el usuario en
 * `ctx.currentUser`). Si el usuario no es admin, corta con 403.
 */
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.currentUser?.role !== 'admin') {
      return ctx.response.status(403).send({
        code: 'FORBIDDEN',
        message: 'Requiere permisos de administrador',
      })
    }
    return next()
  }
}
