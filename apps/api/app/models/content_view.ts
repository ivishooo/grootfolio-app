/**
 * Modelo ContentView (F1). Marca de vista de un contenido por usuario (para el
 * badge NUEVO y el contador de vistas). Tabla en `0006_create_content_tables.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ContentView extends BaseModel {
  static table = 'content_views'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column({ columnName: 'content_item_id' })
  declare contentItemId: string

  @column.dateTime({ autoCreate: true, columnName: 'viewed_at' })
  declare viewedAt: DateTime
}
