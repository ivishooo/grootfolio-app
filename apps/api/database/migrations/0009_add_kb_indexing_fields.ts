/**
 * F3 (Chatbot RAG, ADR-0004). Lo que el esquema de F1 no previó para la ingesta:
 *
 * - `kb_chunks.heading`: sección del artículo a la que pertenece el fragmento.
 *   Sin esto las citas sólo pueden nombrar el artículo; con esto pueden decir
 *   "Artículo › sección", que es lo que hace útil una cita.
 * - `kb_articles.indexed_at` / `indexing_error`: estado de la indexación. La
 *   indexación es sincrónica al publicar, pero el estado se persiste para que
 *   el panel de admin muestre "indexado ✓" o el error concreto.
 *
 * La columna `embedding` NO cambia: sigue en `vector(768)` (se usa
 * `gemini-embedding-001` truncado a 768 vía `outputDimensionality`).
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('kb_chunks', (t) => {
      t.string('heading', 300).nullable()
    })

    this.schema.alterTable('kb_articles', (t) => {
      t.timestamp('indexed_at', { useTz: true }).nullable()
      t.text('indexing_error').nullable()
    })
  }

  async down() {
    this.schema.alterTable('kb_chunks', (t) => {
      t.dropColumn('heading')
    })

    this.schema.alterTable('kb_articles', (t) => {
      t.dropColumn('indexed_at')
      t.dropColumn('indexing_error')
    })
  }
}
