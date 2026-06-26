import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Agrega `is_historical` a price_snapshots (GF-246). Distingue los snapshots de
 * precios de cierre mensual (reconstruccion del historico via CoinGecko
 * market_chart) de los snapshots actuales del cache (GF-220). fetched_at de un
 * snapshot historico es el cierre del mes que representa.
 */
export default class extends BaseSchema {
  protected tableName = 'price_snapshots'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_historical').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_historical')
    })
  }
}
