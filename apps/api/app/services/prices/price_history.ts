/**
 * Precios historicos de cierre mensual (GF-246). Reconstruye el precio de cierre
 * de cada mes para un activo crypto y los cachea como snapshots historicos
 * (is_historical=true, fetched_at = cierre del mes) reusando PriceSnapshot
 * (GF-220). Solo crypto: usa CoinGecko /coins/{id}/market_chart.
 *
 * El cache es la clave: un cierre de un mes ya cerrado no cambia, asi que se
 * persiste una vez y las siguientes lecturas no vuelven a pegarle a CoinGecko.
 */
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import PriceSnapshot from '#models/price_snapshot'
import { fetchMarketChart } from './coingecko_client.js'
import { CG_SYMBOL_TO_ID } from './coingecko_symbol_map.js'

/**
 * Precios de cierre (USD) de los meses `months` (formato 'yyyy-MM', cerrados)
 * para un activo crypto. Devuelve Map mes→precio; los meses sin dato o de
 * activos no-crypto simplemente no aparecen.
 */
export async function monthlyClosePricesUsd(
  asset: { id: string; symbol: string },
  months: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (months.length === 0) return result

  const cgId = CG_SYMBOL_TO_ID[asset.symbol.toUpperCase()]
  if (!cgId) return result // solo crypto conocido por CoinGecko

  // 1. Lo ya cacheado como snapshot historico.
  const cached = await PriceSnapshot.query()
    .where('asset_id', asset.id)
    .where('is_historical', true)
  for (const snap of cached) {
    const month = snap.fetchedAt.toFormat('yyyy-MM')
    if (months.includes(month)) result.set(month, snap.price)
  }

  const missing = months.filter((m) => !result.has(m)).sort()
  if (missing.length === 0) return result

  // 2. Fetch a CoinGecko cubriendo desde el mes faltante mas antiguo hasta hoy.
  const oldest = DateTime.fromFormat(missing[0]!, 'yyyy-MM').startOf('month')
  const days = Math.min(Math.ceil(DateTime.now().diff(oldest, 'days').days) + 2, 365)

  let closeByMonth: Map<string, number>
  try {
    const points = await fetchMarketChart(cgId, days)
    closeByMonth = new Map()
    for (const p of points) {
      // El ultimo punto de cada mes queda como cierre (los puntos vienen en orden).
      closeByMonth.set(DateTime.fromMillis(p.timestamp).toFormat('yyyy-MM'), p.price)
    }
  } catch (err) {
    logger.warn({ err, symbol: asset.symbol }, 'monthlyClosePrices: fallo CoinGecko market_chart')
    return result // degradamos a lo cacheado
  }

  // 3. Persistir los cierres faltantes y sumarlos al resultado.
  const rows: Array<{
    assetId: string
    price: number
    currency: string
    provider: string
    isHistorical: boolean
    fetchedAt: DateTime
  }> = []
  for (const month of missing) {
    const price = closeByMonth.get(month)
    if (price === undefined) continue
    result.set(month, price)
    rows.push({
      assetId: asset.id,
      price,
      currency: 'USD',
      provider: 'coingecko',
      isHistorical: true,
      fetchedAt: DateTime.fromFormat(month, 'yyyy-MM').endOf('month'),
    })
  }
  if (rows.length > 0) await PriceSnapshot.createMany(rows)

  return result
}
