/**
 * Modelo ContentSection (F1). Sección plana de la biblioteca de contenidos.
 * Tabla creada en `0006_create_content_tables.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ContentItem from '#models/content_item'

export default class ContentSection extends BaseModel {
  static table = 'content_sections'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare icon: string | null

  @column()
  declare color: string | null

  @column()
  declare position: number

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @hasMany(() => ContentItem, { foreignKey: 'sectionId' })
  declare items: HasMany<typeof ContentItem>
}
