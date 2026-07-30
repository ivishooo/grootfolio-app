/**
 * F1.4 (Admin/Contenidos). Notificaciones in-app por usuario (campanita).
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      // content.published | profile.moderated | account.suspended
      t.string('type', 40).notNullable()
      t.string('title', 200).notNullable()
      t.text('body').nullable()
      t.jsonb('data').nullable()
      t.timestamp('read_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.index(['user_id', 'read_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
