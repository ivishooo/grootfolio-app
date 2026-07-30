/**
 * Modelo Notification (F1). Notificación in-app por usuario (campanita).
 * Tabla creada en `0007_create_notifications.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Notification extends BaseModel {
  static table = 'notifications'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column()
  declare type: 'content.published' | 'profile.moderated' | 'account.suspended'

  @column()
  declare title: string

  @column()
  declare body: string | null

  @column()
  declare data: Record<string, unknown> | null

  @column.dateTime({ columnName: 'read_at' })
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime
}
