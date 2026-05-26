/**
 * AuthController. Expone `register` (GF-206), `login` (GF-207), `refresh` y
 * `logout` (GF-208); `me` (GF-209) llega en su story.
 */
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, refreshValidator, registerValidator } from '#validators/auth'
import {
  InvalidRefreshTokenError,
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
} from '#services/auth/token_service'

export default class AuthController {
  /**
   * POST /auth/register
   *
   * Crea un usuario y devuelve par de tokens. 409 si el email ya existe.
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const existing = await User.findBy('email', payload.email)
    if (existing) {
      return response.status(409).send({
        code: 'AUTH_EMAIL_TAKEN',
        message: 'Ese email ya esta registrado.',
      })
    }

    const user = await User.create({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName ?? null,
    })

    const { accessToken, refreshToken } = await issueTokenPair(user)

    return response.status(201).send({
      user: user.serialize(),
      accessToken,
      refreshToken,
    })
  }

  /**
   * POST /auth/login
   *
   * Valida credenciales y devuelve par de tokens. 401 generico ante email
   * inexistente o password incorrecta, para no filtrar que emails existen.
   */
  async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)

    const user = await User.findBy('email', payload.email)
    const passwordOk = user && (await User.verifyPassword(payload.password, user.password))

    if (!user || !passwordOk) {
      return response.status(401).send({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Email o password incorrectos.',
      })
    }

    const { accessToken, refreshToken } = await issueTokenPair(user)

    return response.status(200).send({
      user: user.serialize(),
      accessToken,
      refreshToken,
    })
  }

  /**
   * POST /auth/refresh
   *
   * Rota el refresh token: revoca el presentado y devuelve un par nuevo. 401 si
   * el token es invalido, expiro o fue reutilizado (en ese caso revoca todas
   * las sesiones del usuario).
   */
  async refresh({ request, response }: HttpContext) {
    const { refreshToken: presented } = await request.validateUsing(refreshValidator)

    try {
      const { accessToken, refreshToken } = await rotateRefreshToken(presented)
      return response.status(200).send({ accessToken, refreshToken })
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        return response.status(401).send({
          code: 'AUTH_INVALID_REFRESH',
          message: error.message,
        })
      }
      throw error
    }
  }

  /**
   * POST /auth/logout
   *
   * Revoca el refresh token presentado. Idempotente: siempre 204, exista o no
   * el token (no filtra si era valido).
   */
  async logout({ request, response }: HttpContext) {
    const { refreshToken: presented } = await request.validateUsing(refreshValidator)
    await revokeRefreshToken(presented)
    return response.status(204).send(null)
  }
}
