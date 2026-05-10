/**
 * Modelo RefreshToken. La tabla `refresh_tokens` se crea en
 * `0001_initial_schema.ts`.
 *
 * Los tokens son strings opacos generados con `crypto.randomBytes` y
 * persistidos como SHA-256 hex en `token_hash`. Ver `auth/token_service.ts`
 * para la emision, rotacion y revocacion (esta ultima parte llega en
 * GF-208).
 */
import type { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class RefreshToken extends BaseModel {
  static table = 'refresh_tokens'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column({ columnName: 'token_hash' })
  declare tokenHash: string

  @column.dateTime({ columnName: 'expires_at' })
  declare expiresAt: DateTime

  @column.dateTime({ columnName: 'revoked_at' })
  declare revokedAt: DateTime | null

  @column({ columnName: 'replaced_by' })
  declare replacedBy: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
