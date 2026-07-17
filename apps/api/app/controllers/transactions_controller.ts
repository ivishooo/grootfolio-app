/**
 * TransactionsController (GF-212). CRUD de transacciones del usuario
 * autenticado (via `ctx.currentUser` del middleware auth).
 *
 * - GET    /transactions      lista las propias (no borradas)
 * - POST   /transactions      crea; resuelve el asset por symbol+type
 *                             (firstOrCreate en asset_catalog)
 * - DELETE /transactions/:id  soft delete (setea deleted_at)
 *
 * Owner-scope: toda query filtra por `user_id = currentUser.id`, asi un user
 * nunca ve ni toca transacciones de otro.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type { AssetType } from '@grootfolio/shared/types'
import Asset from '#models/asset'
import Transaction from '#models/transaction'
import { createTransactionValidator } from '#validators/transaction'

const PROVIDER_BY_TYPE: Record<AssetType, string> = {
  crypto: 'coingecko',
  stock: 'yahoo',
  bond: 'manual',
  currency: 'frankfurter',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default class TransactionsController {
  /**
   * GET /transactions — transacciones propias, mas recientes primero.
   */
  async index({ currentUser, response }: HttpContext) {
    const transactions = await Transaction.query()
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'desc')

    return response.status(200).send({ transactions: transactions.map((t) => t.serialize()) })
  }

  /**
   * POST /transactions — crea una transaccion. Resuelve el asset por
   * symbol+type (lo crea en el catalogo si no existe).
   */
  async store({ request, response, currentUser }: HttpContext) {
    const payload = await request.validateUsing(createTransactionValidator)

    const purchasedAt = DateTime.fromISO(payload.purchasedAt)
    if (!purchasedAt.isValid) {
      return response.status(422).send({
        code: 'TX_INVALID_DATE',
        message: 'purchasedAt debe ser una fecha ISO 8601 valida.',
      })
    }

    const symbol = payload.symbol.toUpperCase()
    const asset = await Asset.firstOrCreate(
      { symbol, type: payload.type },
      {
        symbol,
        type: payload.type,
        name: symbol,
        currency: 'USD',
        preferredProvider: PROVIDER_BY_TYPE[payload.type],
      }
    )

    const transaction = await Transaction.create({
      userId: currentUser.id,
      assetId: asset.id,
      kind: payload.kind ?? 'buy',
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      fee: payload.fee ?? 0,
      priceCurrency: (payload.priceCurrency ?? 'USD').toUpperCase(),
      purchasedAt,
      notes: payload.notes ?? null,
    })

    await transaction.load('asset')
    return response.status(201).send({ transaction: transaction.serialize() })
  }

  /**
   * DELETE /transactions/:id — soft delete de una transaccion propia.
   * 404 si no existe, no es del usuario, o ya estaba borrada.
   */
  async destroy({ params, response, currentUser }: HttpContext) {
    if (!UUID_RE.test(params.id)) {
      return response.status(404).send({ code: 'TX_NOT_FOUND', message: 'Transaccion no encontrada.' })
    }

    const transaction = await Transaction.query()
      .where('id', params.id)
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .first()

    if (!transaction) {
      return response.status(404).send({ code: 'TX_NOT_FOUND', message: 'Transaccion no encontrada.' })
    }

    transaction.deletedAt = DateTime.now()
    await transaction.save()

    return response.status(204).send(null)
  }
}
