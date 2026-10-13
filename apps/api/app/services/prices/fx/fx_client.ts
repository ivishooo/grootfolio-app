/**
 * fx_client (GF-219). Clientes HTTP de las fuentes de tipo de cambio. Cada
 * funcion dispara una request y devuelve la tasa ya normalizada a `rateToUsd`
 * (USD por 1 unidad de la divisa) delegando el parseo en `fx_rates`.
 *
 * Fuentes:
 *  - Frankfurter (api.frankfurter.dev): principales (EUR, GBP, BRL, ...). Sin key.
 *  - dolarapi.com: dolar CCL (contado con liquidacion) para ARS, valor de hoy.
 *  - argentinadatos.com: el mismo dolar pero POR FECHA, para la base de costo
 *    de operaciones viejas (serie desde 2015, sin key). Devuelve el mismo shape
 *    compra/venta que dolarapi, asi que comparte el parser.
 *  - BCRA (api.bcra.gob.ar): dolar oficial para ARS.
 *
 * El ruteo ARS (ccl vs oficial) y el cache viven en `fx_service`; aca solo
 * mapeamos endpoint -> tasa. Cualquier status no-ok levanta Error para que el
 * service decida el fallback (tasa stale del cache o `null`).
 *
 * Nota BCRA: la API exige TLS valido y puede limitar requests fuera de
 * Argentina; si falla, el modo 'oficial' cae al fallback como cualquier otro
 * error de red.
 */
import {
  bcraRateToUsd,
  dolarApiRateToUsd,
  frankfurterRateToUsd,
  type BcraPayload,
  type DolarApiPayload,
  type FrankfurterPayload,
} from './fx_rates.js'

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v1'
const DOLARAPI_BASE = 'https://dolarapi.com/v1'
const ARGENTINADATOS_BASE = 'https://api.argentinadatos.com/v1/cotizaciones/dolares'
const BCRA_BASE = 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0'

const JSON_HEADERS = { Accept: 'application/json' } as const

/**
 * Pide a Frankfurter las tasas de `symbols` (base USD) y devuelve el mapa
 * `{ SYMBOL: rateToUsd }`. Los symbols que la API no devuelva quedan afuera.
 */
export async function fetchFrankfurterRates(
  symbols: string[]
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {}

  const url = new URL(`${FRANKFURTER_BASE}/latest`)
  url.searchParams.set('base', 'USD')
  url.searchParams.set('symbols', symbols.map((s) => s.toUpperCase()).join(','))

  const res = await fetch(url, { headers: JSON_HEADERS })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Frankfurter HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const payload = (await res.json()) as FrankfurterPayload
  const out: Record<string, number> = {}
  for (const symbol of symbols) {
    const rate = frankfurterRateToUsd(payload, symbol)
    if (rate !== null) out[symbol.toUpperCase()] = rate
  }
  return out
}

/**
 * Igual que `fetchFrankfurterRates` pero para una fecha historica (GF-250).
 * Frankfurter expone `/{date}?base=USD&symbols=...` (yyyy-MM-dd); si la fecha
 * es fin de semana/feriado devuelve el ultimo dia habil, lo cual nos sirve.
 */
export async function fetchFrankfurterRatesAt(
  date: string,
  symbols: string[]
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {}

  const url = new URL(`${FRANKFURTER_BASE}/${date}`)
  url.searchParams.set('base', 'USD')
  url.searchParams.set('symbols', symbols.map((s) => s.toUpperCase()).join(','))

  const res = await fetch(url, { headers: JSON_HEADERS })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Frankfurter HTTP ${res.status} (${date}): ${body.slice(0, 200)}`)
  }

  const payload = (await res.json()) as FrankfurterPayload
  const out: Record<string, number> = {}
  for (const symbol of symbols) {
    const rate = frankfurterRateToUsd(payload, symbol)
    if (rate !== null) out[symbol.toUpperCase()] = rate
  }
  return out
}

/** Dolar CCL via dolarapi.com. Devuelve `rateToUsd` para ARS (USD por 1 ARS). */
export async function fetchCclRateToUsd(): Promise<number | null> {
  const res = await fetch(`${DOLARAPI_BASE}/dolares/contadoconliqui`, { headers: JSON_HEADERS })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`dolarapi HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return dolarApiRateToUsd((await res.json()) as DolarApiPayload)
}

/**
 * Dolar historico por fecha via argentinadatos.com. `date` en yyyy-MM-dd y
 * `casa` el tipo de dolar ('contadoconliqui' u 'oficial'). Devuelve `rateToUsd`
 * para ARS en esa fecha.
 *
 * La serie cubre fines de semana y feriados (repite el ultimo valor habil), pero
 * responde 404 para fechas sin dato —una fecha futura, o anterior al inicio de
 * la serie—. Ese caso devuelve null (no es un error: el caller degrada a la
 * tasa actual), a diferencia de cualquier otro status, que si levanta.
 */
export async function fetchArsRateToUsdAt(
  date: string,
  casa: 'contadoconliqui' | 'oficial'
): Promise<number | null> {
  // La API parte la fecha en el path: /{casa}/{yyyy}/{MM}/{dd}
  const [year, month, day] = date.split('-')
  const res = await fetch(`${ARGENTINADATOS_BASE}/${casa}/${year}/${month}/${day}`, {
    headers: JSON_HEADERS,
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`argentinadatos HTTP ${res.status} (${date}): ${body.slice(0, 200)}`)
  }
  return dolarApiRateToUsd((await res.json()) as DolarApiPayload)
}

/** Dolar oficial via BCRA. Devuelve `rateToUsd` para ARS (USD por 1 ARS). */
export async function fetchOficialRateToUsd(): Promise<number | null> {
  const res = await fetch(`${BCRA_BASE}/Cotizaciones/USD`, { headers: JSON_HEADERS })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`BCRA HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return bcraRateToUsd((await res.json()) as BcraPayload)
}
