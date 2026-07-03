/**
 * Reconstruccion del valor del portfolio mes a mes (GF-246), para el campo
 * `monthlyReturn` de GET /portfolio.
 *
 * Algoritmo: desde la primera transaccion del usuario (cap maxMonths) hasta el
 * mes actual, por cada mes se suma `qty_acumulada_a_fin_de_mes * precio_de_cierre`
 * de cada activo. Meses cerrados usan el cierre historico (price_history); el
 * mes en curso usa el precio actual (currentPrices, de getPrices).
 *
 * Solo crypto en esta version (GF-246): stocks/divisas se incorporan cuando esos
 * providers tengan endpoint historico.
 */
import { DateTime } from 'luxon'
import type Transaction from '#models/transaction'
import type { PriceResult } from './../prices/price_service.js'
import { monthlyClosePricesUsd } from './../prices/price_history.js'

const MONTH_LABELS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export async function computeMonthlyReturn(
  transactions: Transaction[],
  currentPrices: Record<string, PriceResult>,
  maxMonths = 12
): Promise<Array<{ month: string; value: number }>> {
  if (transactions.length === 0) return []

  const now = DateTime.now().startOf('month')
  const firstTx = DateTime.min(...transactions.map((t) => t.purchasedAt)) ?? now
  let first = firstTx.startOf('month')
  const earliest = now.minus({ months: maxMonths - 1 })
  if (first < earliest) first = earliest

  const monthsDt: DateTime[] = []
  for (let m = first; m <= now; m = m.plus({ months: 1 })) monthsDt.push(m)
  const monthKeys = monthsDt.map((m) => m.toFormat('yyyy-MM'))
  const currentKey = now.toFormat('yyyy-MM')
  const pastMonths = monthKeys.filter((m) => m !== currentKey)

  // Activos crypto presentes (unica clase soportada en esta version).
  const cryptoAssets = new Map<string, { id: string; symbol: string }>()
  for (const t of transactions) {
    if (t.asset.type === 'crypto') {
      cryptoAssets.set(t.assetId, { id: t.assetId, symbol: t.asset.symbol })
    }
  }

  // Cierres historicos por activo para los meses cerrados.
  const closesByAsset = new Map<string, Map<string, number>>()
  for (const [assetId, asset] of cryptoAssets) {
    closesByAsset.set(assetId, await monthlyClosePricesUsd(asset, pastMonths))
  }

  const series: Array<{ month: string; value: number }> = []
  for (let i = 0; i < monthsDt.length; i++) {
    const monthDt = monthsDt[i]!
    const monthKey = monthKeys[i]!
    const monthEnd = monthDt.endOf('month')
    const isCurrent = monthKey === currentKey

    // Cantidad acumulada por activo crypto a fin de este mes.
    const qtyByAsset = new Map<string, number>()
    for (const t of transactions) {
      if (t.asset.type !== 'crypto' || t.purchasedAt > monthEnd) continue
      const delta = t.kind === 'sell' ? -t.quantity : t.quantity
      qtyByAsset.set(t.assetId, (qtyByAsset.get(t.assetId) ?? 0) + delta)
    }

    let value = 0
    for (const [assetId, qty] of qtyByAsset) {
      if (qty <= 0) continue
      let price: number | undefined
      if (isCurrent) {
        const symbol = cryptoAssets.get(assetId)!.symbol.toUpperCase()
        const pr = currentPrices[symbol]
        price = pr && pr.price !== null ? pr.price : undefined
      } else {
        price = closesByAsset.get(assetId)?.get(monthKey)
      }
      if (price !== undefined) value += qty * price
    }
    series.push({ month: MONTH_LABELS_ES[monthDt.month - 1]!, value: Number(value.toFixed(2)) })
  }

  return series
}
