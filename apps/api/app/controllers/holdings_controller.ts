/**
 * HoldingsController (GF-213). Expone los holdings agregados del usuario
 * autenticado, calculados desde sus transacciones no borradas.
 *
 * - GET /holdings  →  { holdings: Holding[] }
 *
 * El precio actual y derivados (value, pnl, pnlPercent) vienen en 0 hasta
 * GF-217 (integracion CoinGecko). El endpoint GET /portfolio (GF-214) sera
 * el que enriquezca este resultado con precios reales y agregados de cartera.
 */
import type { HttpContext } from '@adonisjs/core/http'
import Transaction from '#models/transaction'
import { aggregateHoldings } from '#services/portfolio/holdings_service'
import { resolveTxRates } from '#services/prices/fx/tx_rates'

export default class HoldingsController {
  async index({ currentUser, response }: HttpContext) {
    const transactions = await Transaction.query()
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'asc')

    // FX de cada transaccion a la fecha en que se opero, para normalizar el
    // costo (avgPrice) a USD.
    const { rateFor } = await resolveTxRates(transactions)

    const holdings = aggregateHoldings(transactions, rateFor)
    return response.status(200).send({ holdings })
  }
}
