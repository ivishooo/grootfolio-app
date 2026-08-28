/**
 * Moneda base del usuario (preferencia de visualización).
 *
 * Los importes se guardan y se calculan siempre en USD; `base_currency` sólo
 * decide en qué moneda se los muestra, convirtiendo al vuelo con el FX que ya
 * usa el portfolio_service. Hasta ahora el selector existía en la pantalla de
 * Configuración pero no persistía en ningún lado: se elegía ARS y al recargar
 * volvía a USD.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (t) => {
      t.string('base_currency', 3).notNullable().defaultTo('USD')
    })
  }

  async down() {
    this.schema.alterTable('users', (t) => {
      t.dropColumn('base_currency')
    })
  }
}
