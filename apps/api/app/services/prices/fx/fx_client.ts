/**
 * fx_client (GF-219). Clientes HTTP de las fuentes de tipo de cambio. Cada
 * funcion dispara una request y devuelve la tasa ya normalizada a `rateToUsd`
 * (USD por 1 unidad de la divisa) delegando el parseo en `fx_rates`.
 *
 * Fuentes:
 *  - Frankfurter (api.frankfurter.dev): principales (EUR, GBP, BRL, ...). Sin key.
 *  - dolarapi.com: dolar CCL (contado con liquidacion) para ARS.
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

/** Dolar CCL via dolarapi.com. Devuelve `rateToUsd` para ARS (USD por 1 ARS). */
export async function fetchCclRateToUsd(): Promise<number | null> {
  const res = await fetch(`${DOLARAPI_BASE}/dolares/contadoconliqui`, { headers: JSON_HEADERS })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`dolarapi HTTP ${res.status}: ${body.slice(0, 200)}`)
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
