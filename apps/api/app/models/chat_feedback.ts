/**
 * Modelo ChatFeedback (rediseño PR 4). Voto de utilidad de un usuario sobre una
 * respuesta del asistente. Tabla creada en `0011_create_chat_feedback.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ChatFeedback extends BaseModel {
  static table = 'chat_feedback'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'message_id' })
  declare messageId: string

  @column({ columnName: 'user_id' })
  declare userId: string

  /** 1 = útil · -1 = no útil */
  @column()
  declare vote: number

  @column()
  declare comment: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime
}
