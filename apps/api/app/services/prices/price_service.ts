/**
 * price_service (GF-217). Wrapper sobre coingecko_client con:
 *  - mapeo SYMBOL→id usando CG_SYMBOL_TO_ID
 *  - cache in-memory con TTL (`COINGECKO_PRICE_TTL_SECONDS`, default 60s)
 *  - fallback a cache stale si la API falla (rate limit u otro error)
 *  - source explicito en la respuesta para debugging y tests
 *
 * El cache de PriceSnapshot persistente lo cubre GF-220; aca usamos memoria
 * para evitar quemar rate limits durante una sola request a /portfolio que
 * pueda incluir varios holdings del mismo activo.
 */
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { CG_SYMBOL_TO_ID } from './coingecko_symbol_map.js'
import { CoinGeckoRateLimitError, fetchSimplePrice } from './coingecko_client.js'

export type PriceSource = 'cache' | 'coingecko' | 'unsupported'

export interface PriceResult {
  symbol: string
  price: number | null
  source: PriceSource
  fetchedAt: number | null
}

interface CacheEntry {
  price: number
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function ttlMs(): number {
  return (env.get('COINGECKO_PRICE_TTL_SECONDS') ?? 60) * 1000
}

export async function getPrices(symbols: string[]): Promise<Record<string, PriceResult>> {
  const out: Record<string, PriceResult> = {}
  const now = Date.now()
  const ttl = ttlMs()

  const toFetch: { symbol: string; id: string }[] = []
  const fetchIds = new Set<string>()

  for (const raw of symbols) {
    const symbol = raw.toUpperCase()
    if (out[symbol]) continue

    const id = CG_SYMBOL_TO_ID[symbol]
    if (!id) {
      out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
      continue
    }

    const cached = cache.get(symbol)
    if (cached && now - cached.fetchedAt < ttl) {
      out[symbol] = { symbol, price: cached.price, source: 'cache', fetchedAt: cached.fetchedAt }
      continue
    }

    toFetch.push({ symbol, id })
    fetchIds.add(id)
  }

  if (fetchIds.size === 0) return out

  try {
    const remote = await fetchSimplePrice(Array.from(fetchIds))
    for (const { symbol, id } of toFetch) {
      const price = remote[id]?.usd
      if (typeof price === 'number') {
        cache.set(symbol, { price, fetchedAt: now })
        out[symbol] = { symbol, price, source: 'coingecko', fetchedAt: now }
      } else {
        out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
        logger.warn({ symbol, id }, 'CoinGecko devolvio sin precio para id mapeado')
      }
    }
  } catch (err) {
    if (err instanceof CoinGeckoRateLimitError) {
      logger.warn('CoinGecko rate limit; fallback a cache stale si existe')
    } else {
      logger.error({ err }, 'CoinGecko fetch fallo; fallback a cache stale si existe')
    }
    for (const { symbol } of toFetch) {
      const cached = cache.get(symbol)
      out[symbol] = cached
        ? { symbol, price: cached.price, source: 'cache', fetchedAt: cached.fetchedAt }
        : { symbol, price: null, source: 'unsupported', fetchedAt: null }
    }
  }

  return out
}

/**
 * Limpia el cache. Pensado para tests; no usar en runtime.
 */
export function _resetPriceCache(): void {
  cache.clear()
}
