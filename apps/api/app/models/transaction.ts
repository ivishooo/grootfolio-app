/**
 * Modelo Transaction. Mapea la tabla `transactions` (creada en
 * `0001_initial_schema.ts`): cada compra o venta individual de un activo,
 * que luego se agregan en holdings.
 *
 * Las columnas decimal se leen con `consume: Number` porque el driver de
 * Postgres devuelve DECIMAL como string; el contrato compartido
 * (`@grootfolio/shared`) las declara como `number`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Asset from '#models/asset'

const toNumber = (value: string | null) => (value === null ? null : Number(value))

export default class Transaction extends BaseModel {
  static table = 'transactions'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column({ columnName: 'asset_id' })
  declare assetId: string

  @column()
  declare kind: 'buy' | 'sell'

  @column({ consume: toNumber })
  declare quantity: number

  @column({ columnName: 'unit_price', consume: toNumber })
  declare unitPrice: number

  @column({ consume: toNumber })
  declare fee: number

  @column.dateTime({ columnName: 'purchased_at' })
  declare purchasedAt: DateTime

  @column()
  declare notes: string | null

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>
}
