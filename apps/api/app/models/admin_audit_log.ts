/**
 * Modelo AdminAuditLog (F1). Bitácora append-only de acciones de administración.
 * Tabla creada en `0005_create_admin_audit_logs.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class AdminAuditLog extends BaseModel {
  static table = 'admin_audit_logs'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'actor_id' })
  declare actorId: string | null

  @column()
  declare action: string

  @column({ columnName: 'target_type' })
  declare targetType: string

  @column({ columnName: 'target_id' })
  declare targetId: string | null

  @column({ columnName: 'target_label' })
  declare targetLabel: string

  @column()
  declare reason: string | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>
}
