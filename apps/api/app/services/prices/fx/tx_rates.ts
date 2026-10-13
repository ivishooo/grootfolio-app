/**
 * Tasa de cambio a USD de cada transaccion, segun su `priceCurrency` y la FECHA
 * en que se opero.
 *
 * Por que la fecha y no la tasa de hoy (fix 2026-10): la base de costo es lo que
 * el usuario efectivamente pago. Convertir una compra de hace dos años al dolar
 * de hoy no mide rentabilidad, mide devaluacion — y encima daba numeros
 * distintos segun la pantalla, porque Reportes (GF-250) ya usaba la tasa de la
 * fecha mientras Dashboard y Activos usaban la actual: la misma compra de 100
 * EUR valia US$ 105,24 en una y US$ 111,88 en la otra. Este modulo es la unica
 * fuente de esa conversion para los tres endpoints.
 *
 * `approx` marca las tasas que no son historicas de verdad: `getRateToUsdAt`
 * degrada a la tasa actual para ARS y para las monedas que Frankfurter no
 * cubre. Reportes lo expone como `usdApprox` en el ledger.
 */
import logger from '@adonisjs/core/services/logger'
import type Transaction from '#models/transaction'
import { getRateToUsdAt } from './fx_service.js'

export interface TxRates {
  /** rateToUsd por id de transaccion. */
  rateByTx: Map<string, number>
  /** true cuando la tasa no es la historica real sino la actual. */
  approxByTx: Map<string, boolean>
  /** Helper listo para inyectar en los services puros. */
  rateFor: (tx: Transaction) => number
}

export async function resolveTxRates(transactions: Transaction[]): Promise<TxRates> {
  // Cacheamos por (moneda, fecha): varias transacciones del mismo dia y moneda
  // comparten una sola consulta de FX.
  const byKey = new Map<string, { rate: number; approx: boolean }>()
  for (const tx of transactions) {
    if (tx.priceCurrency === 'USD') continue
    const date = tx.purchasedAt.toISODate() ?? ''
    const key = `${tx.priceCurrency}@${date}`
    if (byKey.has(key)) continue
    const resolved = await getRateToUsdAt(tx.priceCurrency, date)
    if (resolved === null) {
      // Sin ninguna tasa: tomar el importe como si fuera USD es inventar plata,
      // pero es lo unico que podemos hacer sin romper el portafolio entero.
      // El validator limita priceCurrency a las monedas soportadas, asi que
      // esto solo se alcanza con datos viejos o cargados por API directa.
      logger.warn(
        { currency: tx.priceCurrency, date },
        'Sin tasa de cambio para la transaccion; se valua 1:1 contra el dolar'
      )
    }
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

  return { rateByTx, approxByTx, rateFor: (tx) => rateByTx.get(tx.id) ?? 1 }
}
