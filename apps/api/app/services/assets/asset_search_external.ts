/**
 * Busqueda de activos en proveedores externos (GF-248, sub-fase D.2). Cuando el
 * catalogo local devuelve pocos resultados, `AssetsController.search` cae aca
 * para completar con:
 *   crypto   -> CoinGecko /search
 *   stock    -> Yahoo search (EQUITY/ETF)
 *   currency -> lista fija de divisas soportadas por fx_service
 *   bond     -> sin proveedor externo (manual)
 *
 * Resultados cacheados in-memory con TTL corto (EXTERNAL_TTL_MS) para no pegarle
 * a los rate limits en cada tecla. Ante cualquier fallo del proveedor devolvemos
 * lista vacia: el caller ya tiene lo local y el autocomplete no debe romperse.
 */
import logger from '@adonisjs/core/services/logger'
import type { AssetSearchResult, AssetType } from '@grootfolio/shared/types'
import { searchCoins } from '#services/prices/coingecko_client'
import { searchStocks } from '#services/prices/providers/yahoo_provider'

const EXTERNAL_TTL_MS = 5 * 60 * 1000

// Divisas soportadas (FRANKFURTER_KNOWN + ARS + USD) con nombre para el picker.
const CURRENCY_CATALOG: ReadonlyArray<{ symbol: string; name: string }> = [
  { symbol: 'USD', name: 'Dolar estadounidense' },
  { symbol: 'EUR', name: 'Euro' },
  { symbol: 'GBP', name: 'Libra esterlina' },
  { symbol: 'JPY', name: 'Yen japones' },
  { symbol: 'CHF', name: 'Franco suizo' },
  { symbol: 'CAD', name: 'Dolar canadiense' },
  { symbol: 'AUD', name: 'Dolar australiano' },
  { symbol: 'CNY', name: 'Yuan chino' },
  { symbol: 'BRL', name: 'Real brasileno' },
  { symbol: 'MXN', name: 'Peso mexicano' },
  { symbol: 'ARS', name: 'Peso argentino' },
]

interface CacheEntry {
  at: number
  results: AssetSearchResult[]
}
const cache = new Map<string, CacheEntry>()

function searchCurrencies(q: string): AssetSearchResult[] {
  const term = q.toLowerCase()
  return CURRENCY_CATALOG.filter(
    (c) => c.symbol.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
  ).map((c) => ({ symbol: c.symbol, name: c.name, type: 'currency' as const, currency: 'USD' }))
}

/**
 * Busca en el proveedor externo correspondiente a `type`. `bond` no tiene
 * proveedor (devuelve vacio). Cachea por (type, q) con TTL corto.
 */
export async function searchExternalAssets(
  type: AssetType,
  q: string
): Promise<AssetSearchResult[]> {
  const key = `${type}:${q.toLowerCase()}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < EXTERNAL_TTL_MS) return hit.results

  let results: AssetSearchResult[] = []
  try {
    if (type === 'crypto') {
      const coins = await searchCoins(q)
      results = coins.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        type: 'crypto' as const,
        currency: 'USD',
      }))
    } else if (type === 'stock') {
      const stocks = await searchStocks(q)
      results = stocks.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        type: 'stock' as const,
        currency: s.currency,
      }))
    } else if (type === 'currency') {
      results = searchCurrencies(q)
    }
    // bond: sin proveedor externo.
  } catch (err) {
    logger.warn({ err, type, q }, 'searchExternalAssets: fallo el proveedor; degrado a vacio')
    results = []
  }

  results = results.slice(0, 10)
  cache.set(key, { at: Date.now(), results })
  return results
}

/** Limpia el cache in-memory. Pensado para tests; no usar en runtime. */
export function _resetExternalSearchCache(): void {
  cache.clear()
}
