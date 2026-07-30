/**
 * F1.1 (Admin/Contenidos). Agrega rol, avatar y estado de moderación/suspensión
 * a `users`. Enums como string + comentario, igual que el resto del esquema.
 * `suspended_until = null` con `status = 'suspended'` significa suspensión
 * indefinida.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (t) => {
      t.string('role', 10).notNullable().defaultTo('user') // user | admin
      t.string('avatar_url').nullable()
      t.string('status', 12).notNullable().defaultTo('active') // active | suspended
      t.timestamp('suspended_until', { useTz: true }).nullable()
      t.text('suspended_reason').nullable()
      t.timestamp('suspended_at', { useTz: true }).nullable()
      t.uuid('suspended_by').references('id').inTable('users').onDelete('SET NULL').nullable()
      t.index('role')
      t.index('status')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (t) => {
      t.dropColumn('role')
      t.dropColumn('avatar_url')
      t.dropColumn('status')
      t.dropColumn('suspended_until')
      t.dropColumn('suspended_reason')
      t.dropColumn('suspended_at')
      t.dropColumn('suspended_by')
    })
  }
}
