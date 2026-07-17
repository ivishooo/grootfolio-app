import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Agrega `price_currency` a transactions (Fase C — moneda del precio).
 *
 * unitPrice y fee pasan a estar expresados en esta moneda; el costo se normaliza
 * a USD en la agregación (holdings_service) usando el FX de `price_currency`.
 * Default 'USD': las transacciones existentes conservan su comportamiento
 * (siempre se asumieron en USD), sin cambiar sus cálculos.
 */
export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('price_currency', 10).notNullable().defaultTo('USD')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('price_currency')
    })
  }
}
