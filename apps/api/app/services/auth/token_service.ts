/**
 * Emision de tokens de auth. Implementa la decision D1 del plan de Fase 5:
 *
 * - Access token: JWT firmado con HS256, payload `{ sub, email }`, vida
 *   leida de `JWT_ACCESS_TTL` (default 15m).
 * - Refresh token: string opaco aleatorio (48 bytes -> base64url), guardado
 *   hasheado con SHA-256 en `refresh_tokens.token_hash`. Vida leida de
 *   `JWT_REFRESH_TTL` (default 30d).
 *
 * La rotacion (consumir el viejo, emitir uno nuevo, revocar la familia ante
 * reuso) la implementa `rotateRefreshToken` (GF-208).
 */
import crypto from 'node:crypto'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { DateTime, type DurationLikeObject } from 'luxon'
import env from '#start/env'
import RefreshToken from '#models/refresh_token'
import User from '#models/user'

/**
 * Se lanza cuando el refresh token presentado no sirve (inexistente, expirado,
 * o ya consumido). El controller la mapea a 401. Mensaje generico para no
 * revelar cual de los casos ocurrio.
 */
export class InvalidRefreshTokenError extends Error {
  constructor(message = 'Refresh token invalido o expirado.') {
    super(message)
    this.name = 'InvalidRefreshTokenError'
  }
}

const REFRESH_BYTES = 48

export interface AccessTokenPayload {
  sub: string
  email: string
}

/**
 * Se lanza cuando el access token presentado no verifica (firma invalida,
 * expirado, o payload mal formado). El middleware la mapea a 401.
 */
export class InvalidAccessTokenError extends Error {
  constructor(message = 'Access token invalido o expirado.') {
    super(message)
    this.name = 'InvalidAccessTokenError'
  }
}

interface IssuedTokenPair {
  accessToken: string
  refreshToken: string
  refreshTokenId: string
}

const DURATION_UNITS: Record<string, keyof DurationLikeObject> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
}

function parseDuration(value: string): DurationLikeObject {
  const match = /^(\d+)([smhd])$/.exec(value)
  if (!match) {
    throw new Error(`Duracion invalida en env: ${value}. Esperado formato Nd|Nh|Nm|Ns.`)
  }
  const amount = Number(match[1])
  const unit = DURATION_UNITS[match[2] as keyof typeof DURATION_UNITS]
  if (!unit) {
    throw new Error(`Unidad desconocida en duracion: ${value}`)
  }
  return { [unit]: amount }
}

export function signAccessToken(user: Pick<User, 'id' | 'email'>): string {
  const payload: AccessTokenPayload = { sub: user.id, email: user.email }
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.get('JWT_ACCESS_TTL') as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.get('JWT_SECRET'), options)
}

/**
 * Verifica un access token JWT (firma HS256 + expiracion) y devuelve su
 * payload. Lanza `InvalidAccessTokenError` si no verifica o esta mal formado.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: string | JwtPayload
  try {
    decoded = jwt.verify(token, env.get('JWT_SECRET'), { algorithms: ['HS256'] })
  } catch {
    throw new InvalidAccessTokenError()
  }

  if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
    throw new InvalidAccessTokenError()
  }

  return { sub: decoded.sub, email: decoded.email }
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(REFRESH_BYTES).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function issueRefreshToken(userId: string): Promise<{ token: string; record: RefreshToken }> {
  const token = generateRefreshTokenString()
  const tokenHash = hashRefreshToken(token)
  const expiresAt = DateTime.now().plus(parseDuration(env.get('JWT_REFRESH_TTL')))

  const record = await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
  })

  return { token, record }
}

export async function issueTokenPair(user: User): Promise<IssuedTokenPair> {
  const accessToken = signAccessToken(user)
  const { token: refreshToken, record } = await issueRefreshToken(user.id)
  return { accessToken, refreshToken, refreshTokenId: record.id }
}

/**
 * Revoca todos los refresh tokens activos de un usuario. Se usa ante deteccion
 * de reuso (posible robo de token): cortamos todas las sesiones de golpe.
 */
export async function revokeAllForUser(userId: string): Promise<void> {
  await RefreshToken.query()
    .where('user_id', userId)
    .whereNull('revoked_at')
    .update({ revoked_at: DateTime.now().toSQL() })
}

/**
 * Rota un refresh token: valida el presentado, revoca el viejo y emite un par
 * nuevo encadenando con `replaced_by`.
 *
 * Deteccion de reuso: si el token presentado ya fue rotado (tiene `replaced_by`)
 * y se vuelve a presentar, asumimos robo y revocamos toda la familia del usuario
 * (todas sus sesiones activas), luego rechazamos. Un token revocado por logout
 * o por una revocacion previa (sin `replaced_by`) es simplemente invalido: no
 * vuelve a disparar la revocacion en cascada.
 */
export async function rotateRefreshToken(presentedToken: string): Promise<IssuedTokenPair> {
  const tokenHash = hashRefreshToken(presentedToken)
  const record = await RefreshToken.findBy('tokenHash', tokenHash)

  if (!record) {
    throw new InvalidRefreshTokenError()
  }

  if (record.revokedAt) {
    if (record.replacedBy) {
      await revokeAllForUser(record.userId)
      throw new InvalidRefreshTokenError(
        'Refresh token reutilizado: se revocaron todas las sesiones.'
      )
    }
    throw new InvalidRefreshTokenError()
  }

  if (record.expiresAt.toMillis() <= Date.now()) {
    throw new InvalidRefreshTokenError()
  }

  const user = await User.find(record.userId)
  if (!user) {
    throw new InvalidRefreshTokenError()
  }

  const accessToken = signAccessToken(user)
  const { token: refreshToken, record: nextRecord } = await issueRefreshToken(user.id)

  record.revokedAt = DateTime.now()
  record.replacedBy = nextRecord.id
  await record.save()

  return { accessToken, refreshToken, refreshTokenId: nextRecord.id }
}

/**
 * Revoca un refresh token puntual (logout). Idempotente: si no existe o ya
 * estaba revocado, no hace nada y no tira.
 */
export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(presentedToken)
  const record = await RefreshToken.findBy('tokenHash', tokenHash)
  if (record && !record.revokedAt) {
    record.revokedAt = DateTime.now()
    await record.save()
  }
}
