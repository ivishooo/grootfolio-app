/**
 * reports_service (GF-250, Fase F). P&L realizado por posiciones cerradas o
 * parcialmente vendidas. A diferencia de `holdings_service` (que descarta lo
 * vendido), aca recorremos TODAS las transacciones por activo con metodo WAC y
 * en cada venta calculamos la ganancia/perdida realizada en USD.
 *
 * Realizado por venta: `proceeds_usd - costBasis_usd_vendido`, donde
 *  - proceeds_usd = qtyVendida * unitPriceUsd - feeUsd  (el fee reduce el ingreso)
 *  - costBasis_usd_vendido = avgCostUsd * qtyVendida
 *
 * La conversion a USD por transaccion la resuelve el caller (FX de la fecha de
 * la operacion) y se inyecta como `rateFor(tx)`, manteniendo el servicio puro.
 *
 * Casos borde:
 *  - vender mas de lo que se tiene: se realiza solo sobre la cantidad disponible;
 *    el excedente se ignora (no hay short en el MVP).
 *  - posicion reabierta: al cerrar (qty<=0) el estado se resetea; el proximo buy
 *    arranca un avg nuevo.
 */
import type Transaction from '#models/transaction'
import type { RealizedPnl, RealizedPoint } from '@grootfolio/shared/types'

export interface RealizedResult {
  realizedByAsset: RealizedPnl[]
  realizedTotal: number
  realizedSeries: RealizedPoint[]
}

interface AssetBucket {
  asset: Transaction['asset']
  txs: Transaction[]
}

const round2 = (n: number) => Number(n.toFixed(2))

/**
 * @param transactions transacciones del usuario (con `asset` precargado).
 * @param rateFor devuelve el `rateToUsd` a aplicar a `unitPrice`/`fee` de cada
 *   transaccion (segun su `priceCurrency` y fecha). USD -> 1.
 */
export function computeRealizedPnl(
  transactions: Transaction[],
  rateFor: (tx: Transaction) => number
): RealizedResult {
  const byAsset = new Map<string, AssetBucket>()
  for (const tx of transactions) {
    if (!tx.asset) throw new Error('computeRealizedPnl: Transaction.asset debe estar precargado')
    const bucket = byAsset.get(tx.assetId)
    if (bucket) bucket.txs.push(tx)
    else byAsset.set(tx.assetId, { asset: tx.asset, txs: [tx] })
  }

  const realizedByAsset: RealizedPnl[] = []
  // Ventas de todos los activos, para la serie acumulada global ordenada por fecha.
  const sells: Array<{ millis: number; date: string; realized: number }> = []

  for (const [assetId, { asset, txs }] of byAsset) {
    const ordered = [...txs].sort((a, b) => a.purchasedAt.toMillis() - b.purchasedAt.toMillis())

    let qty = 0
    let cost = 0
    let realized = 0
    let proceeds = 0
    let costBasis = 0
    let quantitySold = 0

    for (const tx of ordered) {
      const rate = tx.priceCurrency === 'USD' ? 1 : rateFor(tx)
      if (tx.kind === 'buy') {
        qty += tx.quantity
        cost += tx.quantity * tx.unitPrice * rate + tx.fee * rate
        continue
      }
      // sell
      if (qty <= 0) continue // nada que vender (sin short)
      const soldQty = Math.min(tx.quantity, qty)
      const avgCost = cost / qty
      const soldCostBasis = avgCost * soldQty
      const soldProceeds = soldQty * tx.unitPrice * rate - tx.fee * rate
      const soldRealized = soldProceeds - soldCostBasis

      realized += soldRealized
      proceeds += soldProceeds
      costBasis += soldCostBasis
      quantitySold += soldQty

      cost -= soldCostBasis
      qty -= soldQty
      if (qty <= 0) {
        qty = 0
        cost = 0
      }

      sells.push({
        millis: tx.purchasedAt.toMillis(),
        date: tx.purchasedAt.toISO() ?? '',
        realized: soldRealized,
      })
    }

    if (quantitySold > 0) {
      realizedByAsset.push({
        assetId,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        realized: round2(realized),
        proceeds: round2(proceeds),
        costBasis: round2(costBasis),
        quantitySold,
      })
    }
  }

  realizedByAsset.sort((a, b) => b.realized - a.realized)

  // Serie de realizado acumulado (uno por venta, orden cronologico global).
  sells.sort((a, b) => a.millis - b.millis)
  let running = 0
  const realizedSeries: RealizedPoint[] = sells.map((s) => {
    running += s.realized
    return { date: s.date, cumulative: round2(running) }
  })

  const realizedTotal = round2(realizedByAsset.reduce((acc, r) => acc + r.realized, 0))

  return { realizedByAsset, realizedTotal, realizedSeries }
}
