/**
 * Modelo Asset. Mapea la tabla `asset_catalog` (creada en
 * `0001_initial_schema.ts`): el catalogo de instrumentos invertibles
 * (crypto, accion, ETF, bono, divisa) sobre los que se arman las
 * transacciones y holdings.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { AssetType } from '@grootfolio/shared/types'

export default class Asset extends BaseModel {
  static table = 'asset_catalog'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare symbol: string

  @column()
  declare name: string

  @column()
  declare type: AssetType

  @column()
  declare currency: string

  @column({ columnName: 'preferred_provider' })
  declare preferredProvider: string

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime
}
