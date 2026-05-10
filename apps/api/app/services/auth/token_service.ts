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
 * reuso) llega en GF-208. Hoy solo emitimos.
 */
import crypto from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { DateTime, type DurationLikeObject } from 'luxon'
import env from '#start/env'
import RefreshToken from '#models/refresh_token'
import type User from '#models/user'

const REFRESH_BYTES = 48

interface AccessTokenPayload {
  sub: string
  email: string
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
