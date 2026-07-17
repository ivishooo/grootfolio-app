/**
 * ReportsController (GF-250, Fase F). Reportes del usuario autenticado:
 *
 * - GET /reports/transactions  ledger completo (todas las transacciones no
 *                              borradas, incluidas las de posiciones cerradas)
 *                              valuadas en USD con el FX de la fecha de cada op.
 * - GET /reports/summary       P&L realizado (total, por activo, serie
 *                              acumulada) + balance historico mark-to-market.
 *
 * El FX por fecha (`getRateToUsdAt`) da precision temporal; para ARS/desconocidas
 * se degrada a la tasa actual y se marca `usdApprox`. El balance historico
 * reutiliza `computeMonthlyReturn` (crypto-only en esta version).
 */
import type { HttpContext } from '@adonisjs/core/http'
import Transaction from '#models/transaction'
import type { AssetRef } from '#services/prices/price_service'
import { computeRealizedPnl } from '#services/portfolio/reports_service'
import { computeMonthlyReturn } from '#services/portfolio/monthly_return'
import { getPrices } from '#services/prices/price_service'
import { getRateToUsdAt } from '#services/prices/fx/fx_service'
import type { LedgerEntry, ReportSummary } from '@grootfolio/shared/types'

const round2 = (n: number) => Number(n.toFixed(2))

/**
 * Resuelve el rateToUsd (y si es aproximado) de cada transaccion segun su
 * priceCurrency y la fecha de la operacion. Cachea por (moneda, fecha) para no
 * repetir requests de FX historico.
 */
async function resolveTxRates(transactions: Transaction[]) {
  const byKey = new Map<string, { rate: number; approx: boolean }>()
  for (const tx of transactions) {
    if (tx.priceCurrency === 'USD') continue
    const date = tx.purchasedAt.toISODate() ?? ''
    const key = `${tx.priceCurrency}@${date}`
    if (byKey.has(key)) continue
    const resolved = await getRateToUsdAt(tx.priceCurrency, date)
    byKey.set(key, resolved ?? { rate: 1, approx: true })
  }

  const rateByTx = new Map<string, number>()
  const approxByTx = new Map<string, boolean>()
  for (const tx of transactions) {
    if (tx.priceCurrency === 'USD') {
      rateByTx.set(tx.id, 1)
      approxByTx.set(tx.id, false)
      continue
    }
    const date = tx.purchasedAt.toISODate() ?? ''
    const resolved = byKey.get(`${tx.priceCurrency}@${date}`) ?? { rate: 1, approx: true }
    rateByTx.set(tx.id, resolved.rate)
    approxByTx.set(tx.id, resolved.approx)
  }
  return { rateByTx, approxByTx }
}

export default class ReportsController {
  /** GET /reports/transactions — ledger valuado en USD, mas reciente primero. */
  async transactions({ currentUser, response }: HttpContext) {
    const txs = await Transaction.query()
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'desc')

    const { rateByTx, approxByTx } = await resolveTxRates(txs)

    const ledger: LedgerEntry[] = txs.map((tx) => {
      const rate = rateByTx.get(tx.id) ?? 1
      const unitPriceUsd = tx.unitPrice * rate
      const feeUsd = tx.fee * rate
      const gross = tx.quantity * unitPriceUsd
      const amountUsd = tx.kind === 'buy' ? gross + feeUsd : gross - feeUsd
      return {
        id: tx.id,
        assetId: tx.assetId,
        symbol: tx.asset.symbol,
        name: tx.asset.name,
        type: tx.asset.type,
        kind: tx.kind,
        quantity: tx.quantity,
        unitPrice: tx.unitPrice,
        priceCurrency: tx.priceCurrency,
        fee: tx.fee,
        unitPriceUsd: round2(unitPriceUsd),
        feeUsd: round2(feeUsd),
        amountUsd: round2(amountUsd),
        purchasedAt: tx.purchasedAt.toISO() ?? '',
        usdApprox: approxByTx.get(tx.id) ?? false,
      }
    })

    return response.status(200).send({ transactions: ledger })
  }

  /** GET /reports/summary — realizado + balance historico. */
  async summary({ currentUser, response }: HttpContext) {
    const txs = await Transaction.query()
      .where('user_id', currentUser.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'asc')

    if (txs.length === 0) {
      const empty: ReportSummary = {
        realizedTotal: 0,
        realizedByAsset: [],
        realizedSeries: [],
        historicalBalance: [],
      }
      return response.status(200).send({ summary: empty })
    }

    const { rateByTx } = await resolveTxRates(txs)
    const realized = computeRealizedPnl(txs, (tx) => rateByTx.get(tx.id) ?? 1)

    // Balance historico mark-to-market: reutiliza computeMonthlyReturn (crypto-only).
    const cryptoRefs = new Map<string, AssetRef>()
    for (const tx of txs) {
      if (tx.asset.type === 'crypto') {
        cryptoRefs.set(tx.assetId, { id: tx.assetId, symbol: tx.asset.symbol, type: 'crypto' })
      }
    }
    const prices = cryptoRefs.size > 0 ? await getPrices([...cryptoRefs.values()]) : {}
    const monthly = await computeMonthlyReturn(txs, prices, 12)

    const summary: ReportSummary = {
      realizedTotal: realized.realizedTotal,
      realizedByAsset: realized.realizedByAsset,
      realizedSeries: realized.realizedSeries,
      // estimated=false: en esta version el valor es crypto-only y no marcamos
      // meses parciales; la limitacion se documenta a nivel de feature.
      historicalBalance: monthly.map((m) => ({ month: m.month, value: m.value, estimated: false })),
    }

    return response.status(200).send({ summary })
  }
}
