/**
 * Auth middleware (GF-209). Protege rutas que requieren usuario autenticado:
 *
 * 1. Lee el access token del header `Authorization: Bearer <token>`.
 * 2. Verifica firma + expiracion via `verifyAccessToken`.
 * 3. Carga el usuario del `sub` y lo deja en `ctx.currentUser`.
 *
 * Cualquier fallo (sin header, token invalido/expirado, usuario inexistente)
 * corta con 401 y un `code` estable para el cliente.
 */
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import User from '#models/user'
import { verifyAccessToken } from '#services/auth/token_service'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    currentUser: User
  }
}

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const header = ctx.request.header('authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null

    if (!token) {
      return ctx.response.status(401).send({
        code: 'AUTH_NO_TOKEN',
        message: 'Falta el access token.',
      })
    }

    let payload
    try {
      payload = verifyAccessToken(token)
    } catch {
      return ctx.response.status(401).send({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Access token invalido o expirado.',
      })
    }

    const user = await User.find(payload.sub)
    if (!user) {
      return ctx.response.status(401).send({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'El usuario del token ya no existe.',
      })
    }

    ctx.currentUser = user
    return next()
  }
}
