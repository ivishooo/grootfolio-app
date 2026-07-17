/**
 * yahoo_provider (GF-218). Cliente Yahoo Finance via `yahoo-finance2`.
 *
 * Yahoo no requiere API key y tolera ~100 req/min. La libreria valida el
 * response con Zod por defecto; cuando Yahoo cambia el shape de respuesta
 * podriamos necesitar `validateResult: false` puntual — por ahora confiamos
 * en los defaults.
 *
 * Devuelve `{price, currency}` tal cual viene de Yahoo. La normalizacion a USD
 * la hace el orquestador (price_service): los tickers .BA vienen como
 * `{price: ..., currency: 'ARS'}` y desde GF-219 se convierten a USD via
 * fx_service en vez de marcarse `unsupported`.
 *
 * Symbols fuera del whitelist (`YAHOO_KNOWN_SYMBOLS`) se devuelven null sin
 * gastar request, igual que CoinGecko con su mapeo.
 */
import YahooFinance from 'yahoo-finance2'
import type { AssetRef, PriceProvider, ProviderQuote } from './types.js'
import { YAHOO_KNOWN_SYMBOLS } from './yahoo_symbol_map.js'

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
type YahooClient = {
  quote(symbols: string[]): Promise<unknown>
  search(query: string): Promise<unknown>
}
const YahooFinanceCtor = YahooFinance as unknown as new () => YahooClient
const yahooFinance = new YahooFinanceCtor()

export interface StockSearchHit {
  symbol: string
  name: string
  currency: string
}

/**
 * Busqueda de acciones/ETFs via Yahoo `search` (GF-248 D.2). Filtra a
 * EQUITY/ETF y arma symbol+name+currency. Yahoo no siempre devuelve `currency`
 * en la busqueda: para tickers `.BA` asumimos ARS (convencion del catalogo),
 * el resto default USD. Ante cualquier error devolvemos lista vacia (el caller
 * degrada a lo local).
 */
export async function searchStocks(query: string): Promise<StockSearchHit[]> {
  const raw = await yahooFinance.search(query)
  const quotes =
    (raw as { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; quoteType?: string; currency?: string }> })
      .quotes ?? []

  const out: StockSearchHit[] = []
  for (const q of quotes) {
    const symbol = q.symbol?.toUpperCase()
    if (!symbol) continue
    if (q.quoteType !== 'EQUITY' && q.quoteType !== 'ETF') continue
    const currency = q.currency?.toUpperCase() ?? (symbol.endsWith('.BA') ? 'ARS' : 'USD')
    out.push({ symbol, name: q.longname ?? q.shortname ?? symbol, currency })
  }
  return out
}

export const yahooProvider: PriceProvider = {
  name: 'yahoo',
  async fetchQuotes(assets: AssetRef[]): Promise<Record<string, ProviderQuote | null>> {
    const out: Record<string, ProviderQuote | null> = {}
    const toQuery: string[] = []

    for (const a of assets) {
      const symbol = a.symbol.toUpperCase()
      if (symbol in out) continue
      if (!YAHOO_KNOWN_SYMBOLS.has(symbol)) {
        out[symbol] = null
        continue
      }
      toQuery.push(symbol)
    }

    if (toQuery.length === 0) return out

    const raw = await yahooFinance.quote(toQuery)
    const quotes: YahooQuoteShape[] = Array.isArray(raw)
      ? (raw as YahooQuoteShape[])
      : [raw as YahooQuoteShape]

    const seen = new Set<string>()
    for (const q of quotes) {
      const sym = q.symbol?.toUpperCase()
      if (!sym) continue
      seen.add(sym)
      const price = q.regularMarketPrice
      const currency = q.currency
      out[sym] =
        typeof price === 'number' && currency ? { price, currency: currency.toUpperCase() } : null
    }
    for (const s of toQuery) {
      if (!seen.has(s)) out[s] = null
    }
    return out
  },
}
