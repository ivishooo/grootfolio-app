/**
 * Modelo PriceSnapshot. Mapea la tabla `price_snapshots` (creada en
 * `0001_initial_schema.ts`): cada cotizacion fetcheada de un proveedor
 * externo (CoinGecko, Yahoo, Frankfurter) se persiste como una row con
 * `fetched_at`. La tabla cumple doble rol: cache de DB con TTL configurable
 * (`COINGECKO_DB_TTL_SECONDS`) y futuro insumo de precios historicos (GF-246).
 *
 * `price` se lee con `consume: Number` porque el driver de Postgres devuelve
 * DECIMAL como string; el resto del codigo lo trata como `number`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Asset from '#models/asset'

const toNumber = (value: string | null) => (value === null ? null : Number(value))

export default class PriceSnapshot extends BaseModel {
  static table = 'price_snapshots'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'asset_id' })
  declare assetId: string

  @column({ consume: toNumber })
  declare price: number

  @column()
  declare currency: string

  @column()
  declare provider: string

  @column.dateTime({ columnName: 'fetched_at' })
  declare fetchedAt: DateTime

  /**
   * true = precio de cierre mensual reconstruido (GF-246); false = snapshot
   * actual del cache (GF-220). En historicos, `fetchedAt` es el cierre del mes.
   */
  @column({ columnName: 'is_historical' })
  declare isHistorical: boolean

  @column()
  declare raw: Record<string, unknown> | null

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>
}
