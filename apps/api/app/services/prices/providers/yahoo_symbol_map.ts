/**
 * Normalizacion de tickers para Yahoo Finance.
 *
 * Hasta 2026-10 esto era una whitelist fija de ~34 symbols: todo lo que no
 * estuviera en la lista se devolvia `unsupported` sin consultar. Se la saco
 * porque contradecia al buscador de activos (`/assets/search`), que ofrece y
 * PERSISTE en el catalogo cualquier ticker que Yahoo conozca: el usuario podia
 * dar de alta AMD, SPY, QQQ o MELI y despues verlos para siempre en US$ 0.
 * Yahoo no cobra por symbol desconocido —devuelve un array vacio— asi que la
 * lista no estaba ahorrando nada y si rompia activos legitimos.
 *
 * Lo que si hace falta es traducir las clases de accion: Yahoo las escribe con
 * guion (`BRK-B`), no con punto (`BRK.B`). La vieja whitelist tenia justamente
 * `BRK.B`, y ese ticker invalido hacia fallar la validacion de schema de
 * yahoo-finance2 y se llevaba puesto el lote entero de cotizaciones.
 *
 * El punto si es significativo como separador de mercado (`GGAL.BA`, `VOD.L`),
 * asi que solo convertimos cuando el sufijo es una sola letra —la forma de las
 * clases de accion— y ademas no es un codigo de mercado conocido. Casi todos
 * los sufijos de mercado de Yahoo tienen dos letras (.BA, .TO, .DE, .MX); el
 * unico de una que nos puede cruzar es `.L`, Londres.
 */

/** Sufijo de una sola letra despues del punto: candidato a clase de accion. */
const SHARE_CLASS_RE = /^([A-Z0-9]+)\.([A-Z])$/

/** Mercados de Yahoo con codigo de una sola letra: no son clases de accion. */
const SINGLE_LETTER_MARKETS: ReadonlySet<string> = new Set(['L'])

/**
 * Symbol del catalogo -> symbol tal como lo espera Yahoo. Idempotente: un
 * ticker ya normalizado vuelve igual.
 */
export function toYahooSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase()
  const match = SHARE_CLASS_RE.exec(upper)
  if (!match || SINGLE_LETTER_MARKETS.has(match[2]!)) return upper
  return `${match[1]}-${match[2]}`
}
