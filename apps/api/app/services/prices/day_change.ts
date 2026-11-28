/**
 * day_change (GF-019). Helpers PUROS de la variacion del dia: sin Adonis, sin
 * red, sin DB, para testearlos con `node:test` sin bootstrap.
 *
 * Que se compara contra que (ADR-0007):
 *  - crypto  -> variacion de las ultimas 24 h de CoinGecko (`usd_24h_change`):
 *               crypto no cierra, no hay "cierre de ayer".
 *  - stock   -> precio actual vs `regularMarketPreviousClose` de Yahoo, en la
 *               moneda en que cotiza (un CEDEAR, en pesos, como lo muestra BYMA).
 *  - currency-> tasa de hoy vs la de ayer (ARS al dolar BNA, el resto Frankfurter).
 *  - bond    -> sin cotizacion, sin variacion (null).
 *
 * La convencion es un porcentaje: +1,5 significa "subio 1,5 % hoy".
 */

/** Zona del "hoy" del usuario: el producto es argentino. */
export const DAY_ZONE = 'America/Argentina/Buenos_Aires'

/** Variacion porcentual de `previous` a `current`; null si no es calculable. */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0 || current <= 0) {
    return null
  }
  return (current / previous - 1) * 100
}

/** Un porcentaje que llega de una API externa, o null si no es un numero usable. */
export function asPct(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Variacion del dia guardada en `price_snapshots.raw`. Solo vale si el snapshot
 * es del mismo dia (hora argentina) que `now`: un snapshot de ayer, servido como
 * fallback cuando el provider falla, trae la variacion de AYER, y mostrarla como
 * la de hoy es peor que no mostrar nada.
 */
export function dayChangeFromRaw(
  raw: Record<string, unknown> | null | undefined,
  fetchedAtMs: number,
  nowMs: number
): number | null {
  if (!sameDayInZone(fetchedAtMs, nowMs)) return null
  return asPct(raw?.dayChangePct)
}

/** yyyy-MM-dd de un instante en la zona del producto. */
export function isoDateInZone(ms: number): string {
  // en-CA formatea como yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAY_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

/** yyyy-MM-dd del dia anterior a `ms` en la zona del producto. */
export function previousIsoDateInZone(ms: number): string {
  const [y, m, d] = isoDateInZone(ms).split('-').map(Number)
  // Mediodia UTC del dia local: restar un dia nunca cruza dos fechas.
  const prev = new Date(Date.UTC(y!, m! - 1, d!, 12) - 24 * 60 * 60 * 1000)
  return prev.toISOString().slice(0, 10)
}

function sameDayInZone(a: number, b: number): boolean {
  return isoDateInZone(a) === isoDateInZone(b)
}

/** Lo minimo de un holding que necesita el agregado. */
export interface DayChangeInput {
  value: number
  dayChangePercent: number | null
}

/**
 * Variacion del dia de la cartera, ponderada por valor. Para cada holding con
 * dato se reconstruye su valor de ayer (`value / (1 + pct/100)`) y se compara la
 * suma de hoy contra la de ayer. Los holdings sin variacion (bonos, sin
 * cotizacion) quedan afuera de ambos lados: contarlos como 0 % diluiria el
 * movimiento real. Sin ningun holding con dato -> null.
 */
export function portfolioDayChange(holdings: DayChangeInput[]): number | null {
  let today = 0
  let yesterday = 0
  for (const h of holdings) {
    if (h.dayChangePercent === null || h.value <= 0) continue
    const factor = 1 + h.dayChangePercent / 100
    if (factor <= 0) continue
    today += h.value
    yesterday += h.value / factor
  }
  return yesterday > 0 ? (today / yesterday - 1) * 100 : null
}
