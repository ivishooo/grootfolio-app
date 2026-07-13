/**
 * portfolio_service (GF-214). Combina holdings agregados con precios actuales
 * para producir el `PortfolioSummary` completo que consume el frontend.
 *
 * Funcion pura: recibe holdings (de aggregateHoldings) y un mapa de precios
 * (de getPrices), no toca DB ni red. El controller orquesta las llamadas a
 * los services de holdings y de precios y le pasa los resultados aca.
 *
 * Reglas de agregacion:
 *  - Cada holding se enriquece con currentPrice/value/pnl/pnlPercent. Si el
 *    activo no tiene precio (unsupported), queda con currentPrice=0 y demas
 *    en 0 (mismo placeholder que devuelve /holdings).
 *  - Moneda base USD: el avgPrice (costo) viene en la moneda nativa del activo,
 *    asi que se convierte a USD con el FX actual (`fxRates`, rateToUsd por
 *    moneda) antes de calcular invested/pnl. Sin tasa para una moneda no-USD el
 *    holding queda unsupported (no podemos valuar el costo de forma coherente).
 *  - totalValue, pnlAbsolute, pnlPercent solo cuentan holdings con precio.
 *    Incluir los unsupported inflaria pnlAbsolute en negativo (te diria que
 *    perdiste todo lo invertido en lo no cotizable, lo cual es una mentira
 *    peor que omitirlo).
 *  - bestAsset = activo con mayor pnlPercent entre los priceados. Null si no
 *    hay holdings priceados.
 *  - distribution agrupa value por type; types sin valor positivo se omiten.
 *  - monthlyReturn queda [] en esta version; requiere precios historicos
 *    (story GF-246, bloqueada por GF-220).
 */
import type { AssetType, Holding, PortfolioSummary } from '@grootfolio/shared/types'
import type { PriceResult } from '#services/prices/price_service'

export function aggregatePortfolio(
  rawHoldings: Holding[],
  prices: Record<string, PriceResult>,
  fxRates: Record<string, number> = {}
): PortfolioSummary {
  const holdings: Holding[] = rawHoldings.map((h) => {
    const priceInfo = prices[h.asset.symbol.toUpperCase()]
    const currentPrice = priceInfo?.price ?? 0
    // El avgPrice viene en la moneda nativa del activo (ej. ARS en los .BA),
    // mientras que currentPrice ya esta en USD base. Convertimos el costo a USD
    // con el FX actual (rateToUsd) para que el PnL no mezcle monedas. Si no hay
    // tasa para una moneda no-USD, el holding no se puede valuar -> unsupported.
    const rate = h.asset.currency === 'USD' ? 1 : (fxRates[h.asset.currency] ?? null)
    const avgPrice = rate !== null ? h.avgPrice * rate : h.avgPrice
    if (currentPrice <= 0 || rate === null) {
      return { ...h, avgPrice, currentPrice: 0, value: 0, pnl: 0, pnlPercent: 0 }
    }
    const invested = avgPrice * h.quantity
    const value = currentPrice * h.quantity
    const pnl = value - invested
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0
    return { ...h, avgPrice, currentPrice, value, pnl, pnlPercent }
  })

  const priced = holdings.filter((h) => h.currentPrice > 0)
  const totalValue = priced.reduce((s, h) => s + h.value, 0)
  const totalInvested = priced.reduce((s, h) => s + h.quantity * h.avgPrice, 0)
  const pnlAbsolute = totalValue - totalInvested
  const pnlPercent = totalInvested > 0 ? (pnlAbsolute / totalInvested) * 100 : 0

  let bestHolding: Holding | null = null
  for (const h of priced) {
    if (!bestHolding || h.pnlPercent > bestHolding.pnlPercent) bestHolding = h
  }
  const bestAsset: PortfolioSummary['bestAsset'] = bestHolding
    ? { ...bestHolding.asset, pnlPercent: bestHolding.pnlPercent }
    : null

  const byType = new Map<AssetType, number>()
  for (const h of holdings) {
    if (h.value <= 0) continue
    byType.set(h.asset.type, (byType.get(h.asset.type) ?? 0) + h.value)
  }
  const distribution = Array.from(byType, ([type, value]) => ({ type, value }))

  return {
    totalValue,
    pnlAbsolute,
    pnlPercent,
    bestAsset,
    distribution,
    monthlyReturn: [],
    holdings,
  }
}
