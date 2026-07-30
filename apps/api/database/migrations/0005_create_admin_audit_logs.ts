/**
 * F1.2 (Admin/Contenidos). Bitácora append-only de acciones de administración.
 * No se expone update/delete: solo se insertan y se leen.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admin_audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL').nullable()
      // user.suspend | user.unsuspend | user.avatar_delete | user.rename |
      // content.publish | content.delete | content.section_create
      t.string('action', 40).notNullable()
      t.string('target_type', 30).notNullable()
      t.string('target_id').nullable()
      t.string('target_label', 200).notNullable()
      t.text('reason').nullable()
      t.jsonb('metadata').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.index('actor_id')
      t.index('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
