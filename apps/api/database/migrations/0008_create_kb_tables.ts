/**
 * F1 (Chatbot RAG, ADR-0004). Base de conocimiento del chatbot: artículos en
 * markdown (`kb_articles`) y sus fragmentos vectorizados (`kb_chunks`) para la
 * búsqueda por similitud. Usa la extensión `pgvector`.
 *
 * Dimensión del embedding: 768 (compatible con text-embedding-004 y con
 * gemini-embedding-001 vía output truncado). Si se cambia de modelo a otra
 * dimensión, se requiere una migración nueva que recree la columna.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS vector')

    this.schema.createTable('kb_articles', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.string('title', 200).notNullable()
      t.string('slug', 220).notNullable().unique()
      t.text('body').notNullable() // markdown
      t.string('status', 12).notNullable().defaultTo('draft') // draft | published
      t.timestamp('published_at', { useTz: true }).nullable()
      t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      t.index('status')
    })

    this.schema.createTable('kb_chunks', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('article_id').references('id').inTable('kb_articles').onDelete('CASCADE').notNullable()
      t.integer('ord').notNullable() // orden del fragmento dentro del artículo
      t.text('content').notNullable()
      t.specificType('embedding', 'vector(768)').nullable() // se llena en F3 (ingesta)
      t.integer('token_count').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.index('article_id')
    })

    // Índice HNSW para búsqueda por similitud coseno (pgvector >= 0.5). Se puede
    // crear sobre tabla vacía; no requiere datos de entrenamiento (a diferencia
    // de ivfflat).
    this.schema.raw(
      'CREATE INDEX kb_chunks_embedding_idx ON kb_chunks USING hnsw (embedding vector_cosine_ops)'
    )
  }

  async down() {
    this.schema.dropTable('kb_chunks')
    this.schema.dropTable('kb_articles')
    // La extensión `vector` se deja instalada a propósito (otras features
    // podrían necesitarla; desinstalarla es una operación aparte).
  }
}
