/**
 * fx_service (GF-219). Motor de tipos de cambio compartido: dada una divisa,
 * devuelve `rateToUsd` (cuantos USD vale 1 unidad) resolviendo la fuente y
 * cacheando el resultado in-memory con TTL (`FX_TTL_SECONDS`, default 3600s).
 *
 * Ruteo de fuente:
 *   USD            -> 1 (no hay request)
 *   ARS            -> CCL (dolarapi) u oficial (BCRA) segun `FX_ARS_SOURCE`
 *   resto conocido -> Frankfurter (EUR, GBP, BRL, ...)
 *   desconocida    -> null (sin request)
 *
 * Lo consumen dos lugares: el `fxProvider` (precio de holdings tipo currency =
 * FX directo a USD) y el `price_service`, que lo usa para convertir a USD las
 * quotes que un provider devuelve en otra moneda (ej. los .BA de Yahoo en ARS).
 *
 * Ante un fallo de red devolvemos la ultima tasa cacheada aunque este vencida
 * (mejor stale que romper el portfolio); si nunca hubo tasa, `null`.
 */
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import {
  fetchArsRateToUsdAt,
  fetchCclRateToUsd,
  fetchFrankfurterRates,
  fetchFrankfurterRatesAt,
  fetchOficialRateToUsd,
} from './fx_client.js'

/**
 * Divisas soportadas por Frankfurter que nos interesan en el catalogo. Acotar
 * la lista evita requests por symbols que la API no cubre (ej. ARS, que no
 * esta) y deja el set crecer junto con el catalogo de activos.
 */
const FRANKFURTER_KNOWN: ReadonlySet<string> = new Set([
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'BRL',
  'MXN',
])

interface CacheEntry {
  rate: number
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function ttlMs(): number {
  return (env.get('FX_TTL_SECONDS') ?? 3600) * 1000
}

function arsSource(): 'ccl' | 'oficial' {
  return env.get('FX_ARS_SOURCE') ?? 'ccl'
}

async function fetchRate(currency: string): Promise<number | null> {
  if (currency === 'ARS') {
    return arsSource() === 'oficial' ? fetchOficialRateToUsd() : fetchCclRateToUsd()
  }
  if (FRANKFURTER_KNOWN.has(currency)) {
    const rates = await fetchFrankfurterRates([currency])
    return rates[currency] ?? null
  }
  return null
}

/**
 * `rateToUsd` para `currency` (USD por 1 unidad), o `null` si la divisa no esta
 * soportada por ninguna fuente. USD es la moneda base: siempre 1.
 */
export async function getRateToUsd(currency: string): Promise<number | null> {
  const cur = currency.toUpperCase()
  if (cur === 'USD') return 1

  const now = Date.now()
  const cached = cache.get(cur)
  if (cached && now - cached.fetchedAt < ttlMs()) return cached.rate

  try {
    const rate = await fetchRate(cur)
    if (rate === null || rate <= 0) {
      // Sin tasa fresca: devolvemos la stale si existe (currency no soportada
      // da null directo, sin cache previo).
      return cached?.rate ?? null
    }
    cache.set(cur, { rate, fetchedAt: now })
    return rate
  } catch (err) {
    logger.warn({ err, currency: cur }, 'FX fetch fallo; fallback a tasa cacheada (stale)')
    return cached?.rate ?? null
  }
}

// Cache de tasas historicas por (moneda, fecha). Una tasa historica no cambia,
// asi que no tiene TTL: se guarda para siempre en el proceso.
const historicalCache = new Map<string, number>()

/** Tasas historicas: nombre de la fuente que resolvio, para no recalcular approx. */
const historicalApprox = new Map<string, boolean>()

/**
 * Tasa historica real de una moneda, o null si la fuente no la tiene.
 * Frankfurter cubre EUR/GBP/BRL/...; ARS sale de argentinadatos (misma casa de
 * dolar que el valor de hoy, para no mezclar CCL con oficial dentro del mismo
 * calculo).
 */
async function fetchHistoricalRate(currency: string, date: string): Promise<number | null> {
  if (currency === 'ARS') {
    const casa = arsSource() === 'oficial' ? 'oficial' : 'contadoconliqui'
    return fetchArsRateToUsdAt(date, casa)
  }
  if (FRANKFURTER_KNOWN.has(currency)) {
    const rates = await fetchFrankfurterRatesAt(date, [currency])
    return rates[currency] ?? null
  }
  return null
}

/**
 * `rateToUsd` de `currency` en una fecha `isoDate` (yyyy-MM-dd), para la base de
 * costo y los reportes historicos (GF-250). Devuelve `{ rate, approx }`:
 *  - Frankfurter (EUR, GBP, ...) y ARS (argentinadatos) soportan fecha exacta
 *    -> approx=false.
 *  - Monedas sin fuente historica, fecha fuera de la serie, o fallo de red ->
 *    se degrada a la tasa ACTUAL y approx=true.
 *  - Sin ninguna tasa disponible -> null.
 * USD siempre 1 (approx=false).
 *
 * Que ARS tenga historico importa mas que para un reporte: la base de costo de
 * una compra en pesos se convertia al dolar de HOY, asi que una posicion vieja
 * media devaluacion en vez de rentabilidad.
 */
export async function getRateToUsdAt(
  currency: string,
  isoDate: string
): Promise<{ rate: number; approx: boolean } | null> {
  const cur = currency.toUpperCase()
  if (cur === 'USD') return { rate: 1, approx: false }

  const date = isoDate.slice(0, 10)
  const key = `${cur}@${date}`
  const hit = historicalCache.get(key)
  if (hit !== undefined) return { rate: hit, approx: historicalApprox.get(key) ?? true }

  try {
    const rate = await fetchHistoricalRate(cur, date)
    if (rate !== null && rate > 0) {
      historicalCache.set(key, rate)
      historicalApprox.set(key, false)
      return { rate, approx: false }
    }
  } catch (err) {
    logger.warn({ err, currency: cur, date }, 'FX historico fallo; degrado a tasa actual')
  }

  // Sin fuente historica, fecha fuera de la serie, o fallo: tasa actual.
  const current = await getRateToUsd(cur)
  if (current === null) return null
  historicalCache.set(key, current)
  historicalApprox.set(key, true)
  return { rate: current, approx: true }
}

/** Limpia el cache in-memory de tasas. Pensado para tests; no usar en runtime. */
export function _resetFxCache(): void {
  cache.clear()
  historicalCache.clear()
  historicalApprox.clear()
}
