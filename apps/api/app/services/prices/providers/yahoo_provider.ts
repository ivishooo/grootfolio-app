/**
 * yahoo_provider (GF-218). Cliente Yahoo Finance via `yahoo-finance2`.
 *
 * Yahoo no requiere API key y tolera ~100 req/min. Devuelve `{price, currency}`
 * tal cual viene; la normalizacion a USD la hace el orquestador (price_service):
 * los tickers .BA vienen como `{price: ..., currency: 'ARS'}` y desde GF-219 se
 * convierten a USD via fx_service.
 *
 * Resiliencia por symbol (fix 2026-10). Antes esto pedia todas las cotizaciones
 * en un unico `quote()` con la validacion de schema por defecto: alcanzaba con
 * UN ticker que Yahoo devolviera incompleto para que la libreria tirara
 * `FailedYahooValidationError` y el orquestador se quedara sin precio para
 * TODAS las acciones del usuario (reproducido con `BRK.B`, que ademas estaba en
 * la whitelist del propio repo: una cartera V+MA+PG+BRK.B daba totalValue 0).
 *
 * La validacion de la libreria no nos aporta: ya chequeamos el shape que
 * consumimos (`regularMarketPrice` numerico + `currency`) antes de usarlo, y
 * cualquier entrada que no lo cumpla cae a null. Asi que pedimos con
 * `validateResult: false` y filtramos nosotros, symbol por symbol. Un ticker
 * roto se marca `unsupported` y los demas cotizan igual.
 */
import YahooFinance from 'yahoo-finance2'
import type { AssetRef, PriceProvider, ProviderQuote } from './types.js'
import { toYahooSymbol } from './yahoo_symbol_map.js'

interface YahooQuoteShape {
  symbol?: string
  regularMarketPrice?: number
  currency?: string
}

/**
 * yahoo-finance2 v3 exporta el default como constructor (`new YahooFinance()`,
 * segun su propia doc), pero ts-node-maintained no resuelve su tipo como
 * construible (TS2351) por una diferencia de moduleResolution con tsc — lo que
 * en runtime rompia el import del modulo (y por ende GET /portfolio). Tipamos
 * solo lo que consumimos (`quote`) y construimos por ese contrato, sin depender
 * de esa resolucion. En runtime el default ES la clase.
 */
type QuoteOptions = Record<string, unknown>
type YahooClient = {
  quote(symbols: string[], queryOptions?: QuoteOptions, moduleOptions?: QuoteOptions): Promise<unknown>
  search(query: string): Promise<unknown>
}
const YahooFinanceCtor = YahooFinance as unknown as new (opts?: QuoteOptions) => YahooClient
const yahooFinance = new YahooFinanceCtor({ suppressNotices: ['yahooSurvey'] })

/** Ver el comentario de cabecera: validamos nosotros, no la libreria. */
const NO_SCHEMA_VALIDATION = { validateResult: false } as const

export interface StockSearchHit {
  symbol: string
  name: string
  currency: string
}

/** Sufijo de BYMA: donde cotizan los CEDEARs y las acciones argentinas. */
const BYMA_SUFFIX = '.BA'

/**
 * Busqueda de acciones/ETFs via Yahoo `search` (GF-248 D.2). Filtra a
 * EQUITY/ETF y arma symbol+name+currency. Yahoo no siempre devuelve `currency`
 * en la busqueda: para tickers `.BA` asumimos ARS (convencion del catalogo),
 * el resto default USD. Ante cualquier error devolvemos lista vacia (el caller
 * degrada a lo local).
 *
 * CEDEARs (2026-10): el `search` de Yahoo NO los devuelve —buscar "Adobe" trae
 * ADBE, ADB.DE, ADBE.MX, pero nunca ADBE.BA— aunque `quote` si los cotiza. Como
 * para un usuario argentino el CEDEAR suele ser lo que efectivamente tiene, los
 * sondeamos nosotros: por cada ticker sin sufijo de mercado probamos su `.BA` y
 * lo agregamos ARRIBA del subyacente si Yahoo lo cotiza.
 *
 * Esto es lo que evita el bug que reporto el usuario: cargar el CEDEAR contra
 * el ticker de Nasdaq comparaba un costo en pesos por CEDEAR contra el precio
 * del subyacente en dolares, y daba rendimientos de +4.000%.
 */
export async function searchStocks(query: string): Promise<StockSearchHit[]> {
  const raw = await yahooFinance.search(query)
  const quotes =
    (raw as { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; quoteType?: string; currency?: string }> })
      .quotes ?? []

  const found: StockSearchHit[] = []
  for (const q of quotes) {
    const symbol = q.symbol?.toUpperCase()
    if (!symbol) continue
    if (q.quoteType !== 'EQUITY' && q.quoteType !== 'ETF') continue
    const currency = q.currency?.toUpperCase() ?? (symbol.endsWith(BYMA_SUFFIX) ? 'ARS' : 'USD')
    found.push({ symbol, name: q.longname ?? q.shortname ?? symbol, currency })
  }

  return withCedears(found)
}

/**
 * Palabras que no identifican a una empresa: formas societarias, articulos y
 * el ruido que BYMA mete en el nombre de los CEDEARs ("CEDEAR EACH 24 REP 1").
 */
const RUIDO_RAZON_SOCIAL: ReadonlySet<string> = new Set([
  'INC', 'CORP', 'CORPORATION', 'COMPANY', 'THE', 'LTD', 'LIMITED', 'PLC', 'GROUP',
  'HOLDING', 'HOLDINGS', 'TRUST', 'CEDEAR', 'EACH', 'REP', 'SAB', 'ADR',
])

/** Tokens significativos de una razon social, para comparar dos nombres. */
export function _tokensRazonSocial(nombre: string): Set<string> {
  return new Set(
    nombre
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter((t) => t.length >= 3 && !RUIDO_RAZON_SOCIAL.has(t))
  )
}

/**
 * Si dos razones sociales son de la misma empresa. Alcanza con que compartan un
 * token significativo: "Adobe Inc." y "Adobe Inc." obviamente, pero tambien
 * "The Coca-Cola Company" con cualquier variante de Coca-Cola.
 */
export function mismaEmpresa(a: string, b: string): boolean {
  const ta = _tokensRazonSocial(a)
  for (const t of _tokensRazonSocial(b)) if (ta.has(t)) return true
  return false
}

/**
 * Intercala el CEDEAR de cada ticker que tenga uno. Un solo `quote` para todos
 * los candidatos; si falla, devolvemos la lista original (el CEDEAR es un
 * agregado, no puede romper la busqueda).
 *
 * Ojo con asumir que `XXX.BA` es el CEDEAR de `XXX`: BYMA reasigna tickers y
 * ademas lista series en dolares de la misma especie. `BAC.BA` NO es Bank of
 * America: es el CEDEAR de Boeing en su serie en dolares ("BOEING CO CEDEAR
 * EACH 24 REP 1", US$ 7,81 = los $ 12.550 de BA.BA al CCL). Por eso validamos
 * que el nombre que devuelve Yahoo para el `.BA` sea de la misma empresa que el
 * subyacente, en vez de confiar en el ticker.
 */
async function withCedears(hits: StockSearchHit[]): Promise<StockSearchHit[]> {
  // Solo tickers "pelados": los que ya traen sufijo de mercado (.MX, .DE, .BA)
  // no son el subyacente de un CEDEAR.
  const bases = hits.filter((h) => !h.symbol.includes('.'))
  if (bases.length === 0) return hits

  const porSymbol = new Map<string, StockSearchHit>()
  try {
    const raw = await yahooFinance.quote(
      bases.map((h) => `${h.symbol}${BYMA_SUFFIX}`),
      {},
      NO_SCHEMA_VALIDATION
    )
    const quotes = (Array.isArray(raw) ? raw : [raw]) as Array<
      YahooQuoteShape & { longName?: string; shortName?: string }
    >
    for (const q of quotes) {
      const symbol = q.symbol?.toUpperCase()
      const quote = toQuote(q)
      if (!symbol || !quote) continue
      porSymbol.set(symbol, {
        symbol,
        name: q.longName ?? q.shortName ?? symbol,
        currency: quote.currency,
      })
    }
  } catch {
    return hits
  }

  const out: StockSearchHit[] = []
  for (const hit of hits) {
    const cedear = porSymbol.get(`${hit.symbol}${BYMA_SUFFIX}`)
    // El CEDEAR primero: es lo que compra alguien que opera en pesos.
    if (cedear && mismaEmpresa(hit.name, cedear.name)) {
      out.push({ symbol: cedear.symbol, name: `${hit.name} (CEDEAR)`, currency: cedear.currency })
    }
    out.push(hit)
  }
  return out
}

/** Unica lectura del shape de Yahoo: lo que no cumpla el contrato es null. */
function toQuote(raw: YahooQuoteShape | undefined): ProviderQuote | null {
  if (!raw) return null
  const { regularMarketPrice: price, currency } = raw
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null
  if (!currency) return null
  return { price, currency: currency.toUpperCase() }
}

export const yahooProvider: PriceProvider = {
  name: 'yahoo',
  async fetchQuotes(assets: AssetRef[]): Promise<Record<string, ProviderQuote | null>> {
    const out: Record<string, ProviderQuote | null> = {}
    // symbol de Yahoo -> symbol del catalogo, para devolver con la clave que el
    // orquestador espera aunque hayamos consultado con otra grafia (BRK.B/BRK-B).
    const catalogBySymbol = new Map<string, string>()

    for (const a of assets) {
      const symbol = a.symbol.toUpperCase()
      if (symbol in out) continue
      out[symbol] = null // default: si Yahoo no lo devuelve, queda sin cotizacion
      catalogBySymbol.set(toYahooSymbol(symbol), symbol)
    }

    if (catalogBySymbol.size === 0) return out

    const raw = await yahooFinance.quote([...catalogBySymbol.keys()], {}, NO_SCHEMA_VALIDATION)
    const quotes: YahooQuoteShape[] = Array.isArray(raw)
      ? (raw as YahooQuoteShape[])
      : [raw as YahooQuoteShape]

    for (const q of quotes) {
      const yahooSymbol = q.symbol?.toUpperCase()
      if (!yahooSymbol) continue
      const catalogSymbol = catalogBySymbol.get(yahooSymbol)
      if (!catalogSymbol) continue
      out[catalogSymbol] = toQuote(q)
    }

    return out
  },
}
