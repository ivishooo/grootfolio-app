/**
 * Regla de CEDEARs: que moneda puede tener el precio de una operacion segun el
 * activo. Modulo puro (sin Adonis) para poder testearlo sin bootstrap.
 *
 * El problema que resuelve: un CEDEAR cotiza en pesos en BYMA y representa una
 * fraccion de la accion extranjera. Cargarlo contra el ticker del subyacente
 * —ADBE en vez de ADBE.BA— hace que el motor normalice un costo en pesos por
 * CEDEAR a USD y lo compare contra el precio en Nasdaq, unas 40 veces mas alto.
 * Asi aparecio un +4.109,9% de rentabilidad en el Dashboard de un usuario.
 *
 * No se puede resolver adivinando: una accion de Nasdaq no tiene precio en
 * pesos, asi que si el usuario pago en pesos, compro el CEDEAR. Lo unico
 * sensato es rechazar la combinacion y decirle cual es el ticker correcto.
 */
import type { AssetType } from '@grootfolio/shared/types'

/** Sufijo de BYMA: los CEDEARs y las acciones argentinas cotizan ahi, en pesos. */
export const BYMA_SUFFIX = '.BA'

export interface CurrencyMismatch {
  code: 'TX_CURRENCY_MISMATCH'
  message: string
}

/**
 * Moneda en la que cotiza un activo segun su ticker. Los `.BA` cotizan en
 * pesos; el resto (Nasdaq, NYSE) en dolares.
 */
export function quoteCurrencyFor(symbol: string, type: AssetType): string {
  if (type === 'stock' && symbol.toUpperCase().endsWith(BYMA_SUFFIX)) return 'ARS'
  return 'USD'
}

/**
 * Devuelve el error si la combinacion activo + moneda del precio no tiene
 * sentido, o `null` si es valida.
 *
 * Solo aplica a `stock`: comprar BTC o dolares pagando en pesos es normal y el
 * precio en pesos de esos activos si existe.
 */
export function cedearMismatch(
  symbol: string,
  type: AssetType,
  priceCurrency: string
): CurrencyMismatch | null {
  if (type !== 'stock') return null
  if (priceCurrency.toUpperCase() !== 'ARS') return null
  if (quoteCurrencyFor(symbol, type) === 'ARS') return null

  const upper = symbol.toUpperCase()
  return {
    code: 'TX_CURRENCY_MISMATCH',
    message:
      `${upper} cotiza en dolares. Si compraste el CEDEAR en pesos, cargalo como ` +
      `${upper}${BYMA_SUFFIX}; si compraste la accion afuera, pone el precio en USD.`,
  }
}

/**
 * Reordena resultados de busqueda de acciones poniendo cada CEDEAR arriba de su
 * subyacente (ADBE.BA antes que ADBE).
 *
 * Hace falta porque el orden natural no lo logra: `AssetsController` pone
 * primero lo que ya esta en el catalogo local y despues lo externo, y dentro de
 * lo local ordena por nombre, donde "Adobe Inc." precede a "Adobe Inc.
 * (CEDEAR)". Para alguien que opera en pesos el CEDEAR es lo que tiene, y
 * mostrarlo segundo es justo lo que lleva a elegir el ticker equivocado.
 *
 * Estable: no altera el orden relativo de los activos que no son par
 * CEDEAR/subyacente.
 */
export function sortCedearsFirst<T extends { symbol: string }>(results: T[]): T[] {
  const bySymbol = new Map(results.map((r) => [r.symbol.toUpperCase(), r]))
  const out: T[] = []
  const vistos = new Set<T>()

  for (const r of results) {
    if (vistos.has(r)) continue
    const upper = r.symbol.toUpperCase()
    // Si este es un subyacente que tiene su CEDEAR en la lista, el CEDEAR va primero.
    const cedear = upper.includes('.') ? undefined : bySymbol.get(`${upper}${BYMA_SUFFIX}`)
    if (cedear && !vistos.has(cedear)) {
      out.push(cedear)
      vistos.add(cedear)
    }
    out.push(r)
    vistos.add(r)
  }
  return out
}
