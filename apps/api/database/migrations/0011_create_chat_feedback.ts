/**
 * Rediseño del asistente (PR 4). Voto de utilidad sobre una respuesta del bot.
 *
 * Resuelve el problema 05 del diagnóstico: el bot promete no inventar pero no
 * había forma de medir si la respuesta sirvió. Junto con `retrieval_score`, que
 * ya se guarda por mensaje, permite cruzar "score alto" con "al usuario no le
 * sirvió", que es la señal más útil para calibrar en F7.
 *
 * Un voto por usuario y mensaje: votar de nuevo actualiza el anterior.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('chat_feedback', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('message_id').references('id').inTable('chat_messages').onDelete('CASCADE').notNullable()
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      t.smallint('vote').notNullable() // 1 = útil, -1 = no útil
      t.text('comment').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      t.unique(['message_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable('chat_feedback')
  }
}
