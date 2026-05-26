/**
 * AuthController. Hoy expone `register` (GF-206) y `login` (GF-207); refresh
 * y logout (GF-208), y `me` (GF-209) llegan en sus respectivas stories.
 */
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth'
import { issueTokenPair } from '#services/auth/token_service'

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
}
