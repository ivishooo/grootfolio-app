/**
 * Modelo KbChunk (F1, Chatbot RAG). Fragmento de un KbArticle con su embedding
 * para la búsqueda por similitud. Tabla creada en `0008_create_kb_tables.ts`.
 *
 * La columna `embedding` es un `vector(768)` de pgvector: se persiste como el
 * literal `[0.1,0.2,...]` y se lee de vuelta a `number[]`. Se llena en F3.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import KbArticle from '#models/kb_article'

export default class KbChunk extends BaseModel {
  static table = 'kb_chunks'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'article_id' })
  declare articleId: string

  @column()
  declare ord: number

  @column()
  declare content: string

  /** Sección del artículo de la que salió el fragmento (para las citas). */
  @column()
  declare heading: string | null

  @column({
    columnName: 'embedding',
    prepare: (value: number[] | null) => (value ? `[${value.join(',')}]` : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as number[]) : null),
    serializeAs: null,
  })
  declare embedding: number[] | null

  @column({ columnName: 'token_count' })
  declare tokenCount: number | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @belongsTo(() => KbArticle, { foreignKey: 'articleId' })
  declare article: BelongsTo<typeof KbArticle>
}
