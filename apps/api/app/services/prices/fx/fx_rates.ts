/**
 * fx_rates (GF-219). Helpers PUROS de tipos de cambio: normalizan el shape de
 * cada fuente externa (Frankfurter, dolarapi, BCRA) a una unica semantica
 * comun —"cuantos USD vale 1 unidad de la divisa"— y convierten precios.
 *
 * No importan nada de Adonis (ni env, ni models, ni red): son funciones puras
 * para poder testearlas con `node:test` sin bootstrap. El fetch vive en
 * `fx_client`; el cache y la lectura de env en `fx_service`.
 *
 * Convencion `rateToUsd`: factor por el que se multiplica un precio en la
 * divisa para obtener su equivalente en USD. Ej: 1 EUR = 1.146 USD ->
 * rateToUsd('EUR') = 1.146; 1 ARS = 0.00066 USD -> rateToUsd('ARS') = 0.00066.
 */

/** Shape de `GET /latest?base=USD` de Frankfurter: `rates` da unidades por USD. */
export interface FrankfurterPayload {
  base?: string
  rates?: Record<string, number>
}

/** Shape de una cotizacion de dolarapi.com (`/v1/dolares/...`). */
export interface DolarApiPayload {
  compra?: number
  venta?: number
}

/** Shape de `Cotizaciones/USD` de la API de estadisticas cambiarias del BCRA. */
export interface BcraPayload {
  results?: Array<{
    detalle?: Array<{ codigoMoneda?: string; tipoCotizacion?: number }>
  }>
}

/**
 * Frankfurter devuelve `rates[X]` = cuantas unidades de X equivalen a 1 USD
 * (base USD). Lo que queremos es lo inverso: USD por 1 unidad de X.
 */
export function frankfurterRateToUsd(
  payload: FrankfurterPayload,
  symbol: string
): number | null {
  const unitsPerUsd = payload.rates?.[symbol.toUpperCase()]
  if (typeof unitsPerUsd !== 'number' || unitsPerUsd <= 0) return null
  return 1 / unitsPerUsd
}

/**
 * dolarapi da `compra`/`venta` en ARS por 1 USD. Usamos el punto medio como
 * tasa de referencia neutral (Frankfurter y BCRA exponen un unico valor, asi
 * mantenemos semantica pareja) y devolvemos USD por 1 ARS.
 */
export function dolarApiRateToUsd(payload: DolarApiPayload): number | null {
  const sides = [payload.compra, payload.venta].filter(
    (v): v is number => typeof v === 'number' && v > 0
  )
  if (sides.length === 0) return null
  const arsPerUsd = sides.reduce((acc, v) => acc + v, 0) / sides.length
  return 1 / arsPerUsd
}

/**
 * BCRA expone `tipoCotizacion` en ARS por 1 USD dentro de `results[].detalle[]`.
 * Tomamos la primera entrada cuyo `codigoMoneda` sea USD.
 */
export function bcraRateToUsd(payload: BcraPayload): number | null {
  for (const result of payload.results ?? []) {
    for (const item of result.detalle ?? []) {
      if (item.codigoMoneda?.toUpperCase() === 'USD') {
        const arsPerUsd = item.tipoCotizacion
        if (typeof arsPerUsd !== 'number' || arsPerUsd <= 0) return null
        return 1 / arsPerUsd
      }
    }
  }
  return null
}

/** Convierte un precio en su divisa nativa a USD usando `rateToUsd`. */
export function convertToUsd(nativePrice: number, rateToUsd: number): number {
  return nativePrice * rateToUsd
}
