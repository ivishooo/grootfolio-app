/**
 * Auth middleware - stub.
 * En la Fase 2 del plan se reemplaza por la verificacion JWT real
 * (lectura del header Authorization, validacion del access token,
 * carga del usuario en ctx.auth.user).
 */
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  async handle(_ctx: HttpContext, next: NextFn) {
    // TODO(fase-2): validar JWT, hidratar ctx.auth.user, rechazar con 401 si invalido.
    return next()
  }
}
