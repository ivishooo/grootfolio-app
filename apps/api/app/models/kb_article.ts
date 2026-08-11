/**
 * Modelo KbArticle (F1, Chatbot RAG). Artículo de la base de conocimiento en
 * markdown que alimenta al chatbot. Tabla creada en `0008_create_kb_tables.ts`.
 * La ingesta (chunking + embeddings) llega en F3.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import KbChunk from '#models/kb_chunk'

export default class KbArticle extends BaseModel {
  static table = 'kb_articles'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare slug: string

  @column()
  declare body: string

  @column()
  declare status: 'draft' | 'published'

  @column.dateTime({ columnName: 'published_at' })
  declare publishedAt: DateTime | null

  /** Última indexación exitosa (chunking + embeddings). Null = sin indexar. */
  @column.dateTime({ columnName: 'indexed_at' })
  declare indexedAt: DateTime | null

  /** Motivo del último fallo de indexación; null si la última salió bien. */
  @column({ columnName: 'indexing_error' })
  declare indexingError: string | null

  @column({ columnName: 'created_by' })
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @hasMany(() => KbChunk, { foreignKey: 'articleId' })
  declare chunks: HasMany<typeof KbChunk>
}
