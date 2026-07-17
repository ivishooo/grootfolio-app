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
import { computeMonthlyReturn } from '#services/portfolio/monthly_return'
import { getPrices } from '#services/prices/price_service'
import { getRateToUsd } from '#services/prices/fx/fx_service'

export default class PortfolioController {
  async summary({ currentUser, response }: HttpContext) {
    const transactions = await Transaction.query()
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'asc')

    // FX de las monedas de precio (priceCurrency) para normalizar el costo a USD
    // base en la agregación. Mismo rateToUsd (cacheado) que usa getPrices.
    const fxRates: Record<string, number> = {}
    for (const currency of new Set(transactions.map((t) => t.priceCurrency))) {
      if (currency === 'USD' || fxRates[currency] !== undefined) continue
      const rate = await getRateToUsd(currency)
      if (rate !== null) fxRates[currency] = rate
    }

    const holdings = aggregateHoldings(transactions, fxRates)
    const assetRefs = holdings.map((h) => ({
      id: h.assetId,
      symbol: h.asset.symbol,
      type: h.asset.type,
    }))
    const prices = assetRefs.length > 0 ? await getPrices(assetRefs) : {}

    const portfolio = aggregatePortfolio(holdings, prices)
    // Valor del portfolio mes a mes (GF-246; solo crypto en esta version).
    portfolio.monthlyReturn = await computeMonthlyReturn(transactions, prices)

    return response.status(200).send({ portfolio })
  }
}
