/**
 * PortfolioController (GF-214). Endpoint compuesto que cablea:
 *  - aggregateHoldings (GF-213) → holdings agregados desde transacciones
 *  - getPrices (GF-217) → precios actuales de CoinGecko (con cache)
 *  - aggregatePortfolio (GF-214) → enriquecimiento + agregados totales
 *
 * GET /portfolio → { portfolio: PortfolioSummary }
 *
 * Si el usuario no tiene transacciones, devuelve un summary "vacio" coherente
 * (todos los numericos en 0, arrays vacios) en vez de 404.
 */
import type { HttpContext } from '@adonisjs/core/http'
import Transaction from '#models/transaction'
import { aggregateHoldings } from '#services/portfolio/holdings_service'
import { aggregatePortfolio } from '#services/portfolio/portfolio_service'
import { getPrices } from '#services/prices/price_service'

export default class PortfolioController {
  async summary({ currentUser, response }: HttpContext) {
    const transactions = await Transaction.query()
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'asc')

    const holdings = aggregateHoldings(transactions)
    const symbols = holdings.map((h) => h.asset.symbol)
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}
    const portfolio = aggregatePortfolio(holdings, prices)

    return response.status(200).send({ portfolio })
  }
}
