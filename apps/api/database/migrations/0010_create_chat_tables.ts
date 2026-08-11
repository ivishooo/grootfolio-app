/**
 * F4 (Chatbot RAG, ADR-0004). Conversaciones del chatbot.
 *
 * Se persisten por tres razones: mostrar el historial al reabrir el chat,
 * poder limitar el uso por usuario sin infraestructura extra, y —sobre todo—
 * tener preguntas reales para el capítulo de evaluación de la tesis.
 *
 * `chat_messages.user_id` está desnormalizado a propósito (se podría llegar por
 * la conversación): el rate limit y las consultas de análisis son por usuario y
 * ventana de tiempo, y así no necesitan join.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('chat_conversations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      // Resumen corto para listar conversaciones (la primera pregunta, recortada).
      t.string('title', 200).nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      t.index(['user_id', 'updated_at'])
    })

    this.schema.createTable('chat_messages', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('conversation_id')
        .references('id')
        .inTable('chat_conversations')
        .onDelete('CASCADE')
        .notNullable()
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      t.string('role', 12).notNullable() // user | assistant
      t.text('content').notNullable()

      // Sólo para las respuestas del bot. `grounded` = respondió con respaldo
      // documental; false = devolvió el fallback. `retrieval_score` es el mejor
      // score de similitud obtenido: es el dato que permite calibrar el umbral
      // en F7 con preguntas reales.
      t.boolean('grounded').nullable()
      t.jsonb('sources').nullable()
      t.float('retrieval_score').nullable()

      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.index(['conversation_id', 'created_at'])
      t.index(['user_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable('chat_messages')
    this.schema.dropTable('chat_conversations')
  }
}
