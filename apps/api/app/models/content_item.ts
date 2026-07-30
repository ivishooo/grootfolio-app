/**
 * Modelo ContentItem (F1). Elemento de contenido (doc/video/imagen/enlace).
 * Tabla creada en `0006_create_content_tables.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import ContentSection from '#models/content_section'

export default class ContentItem extends BaseModel {
  static table = 'content_items'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'section_id' })
  declare sectionId: string

  @column()
  declare type: 'doc' | 'video' | 'image' | 'link'

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column({ columnName: 'storage_key' })
  declare storageKey: string | null

  @column({ columnName: 'external_url' })
  declare externalUrl: string | null

  @column({ columnName: 'mime_type' })
  declare mimeType: string | null

  @column({ columnName: 'size_bytes' })
  declare sizeBytes: number | null

  @column({ columnName: 'duration_seconds' })
  declare durationSeconds: number | null

  @column()
  declare status: 'draft' | 'published'

  @column()
  declare pinned: boolean

  @column({ columnName: 'views_count' })
  declare viewsCount: number

  @column.dateTime({ columnName: 'published_at' })
  declare publishedAt: DateTime | null

  @column({ columnName: 'created_by' })
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => ContentSection, { foreignKey: 'sectionId' })
  declare section: BelongsTo<typeof ContentSection>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
