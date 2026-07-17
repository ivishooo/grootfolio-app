/**
 * holdings_service (GF-213). Agregacion de transacciones a holdings por activo.
 *
 * Metodo de costing: WAC (weighted average cost). Cada BUY actualiza el avgPrice
 * ponderando por cantidad e incluyendo el fee en el costo base; cada SELL reduce
 * qty proporcionalmente al costo total acumulado pero no modifica el avgPrice
 * de lo que queda. Si la posicion cierra (qty <= 0), el estado se resetea: el
 * proximo BUY arranca un avg nuevo. Los precios actuales (currentPrice, value,
 * pnl, pnlPercent) quedan en 0 hasta GF-217 (integracion CoinGecko).
 *
 * Funcion pura para poder testearla aislada cuando habilitemos Japa (GF-205).
 */
import type Asset from '#models/asset'
import type Transaction from '#models/transaction'
import type { Holding } from '@grootfolio/shared/types'

interface AssetBucket {
  asset: Asset
  txs: Transaction[]
}

/**
 * @param fxRates mapa `{ MONEDA: rateToUsd }` para normalizar el costo a USD.
 *   unitPrice y fee vienen en `tx.priceCurrency`; se multiplican por su tasa
 *   antes de acumular. Sin tasa (o priceCurrency='USD') se asume factor 1.
 */
export function aggregateHoldings(
  transactions: Transaction[],
  fxRates: Record<string, number> = {}
): Holding[] {
  const byAsset = new Map<string, AssetBucket>()
  for (const tx of transactions) {
    if (!tx.asset) {
      throw new Error('aggregateHoldings: Transaction.asset debe estar precargado')
    }
    const bucket = byAsset.get(tx.assetId)
    if (bucket) bucket.txs.push(tx)
    else byAsset.set(tx.assetId, { asset: tx.asset, txs: [tx] })
  }

  const holdings: Holding[] = []
  for (const [assetId, { asset, txs }] of byAsset) {
    txs.sort((a, b) => a.purchasedAt.toMillis() - b.purchasedAt.toMillis())

    let qty = 0
    let totalCost = 0
    for (const tx of txs) {
      // Normalización a USD: unitPrice y fee están en tx.priceCurrency.
      const rate = tx.priceCurrency === 'USD' ? 1 : (fxRates[tx.priceCurrency] ?? 1)
      if (tx.kind === 'buy') {
        qty += tx.quantity
        totalCost += tx.quantity * tx.unitPrice * rate + tx.fee * rate
        continue
      }
      // sell: reduce qty y costo proporcional; el fee del sell no afecta avgPrice.
      if (qty <= 0) {
        qty = 0
        totalCost = 0
        continue
      }
      const sellRatio = Math.min(tx.quantity / qty, 1)
      totalCost -= totalCost * sellRatio
      qty -= tx.quantity
      if (qty <= 0) {
        qty = 0
        totalCost = 0
      }
    }

    if (qty <= 0) continue

    holdings.push({
      assetId,
      asset: {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        currency: asset.currency,
      },
      quantity: qty,
      avgPrice: totalCost / qty,
      currentPrice: 0,
      value: 0,
      pnl: 0,
      pnlPercent: 0,
    })
  }

  holdings.sort((a, b) => a.asset.symbol.localeCompare(b.asset.symbol))
  return holdings
}
