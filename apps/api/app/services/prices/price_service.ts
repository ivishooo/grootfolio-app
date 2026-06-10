/**
 * price_service (GF-217 + GF-220). Resuelve precios de activos con cascada
 * de tres niveles:
 *
 *   1. Cache in-memory por proceso (TTL `COINGECKO_PRICE_TTL_SECONDS`, def. 60s)
 *   2. Snapshot persistente en `price_snapshots` (TTL `COINGECKO_DB_TTL_SECONDS`,
 *      def. 300s) — sobrevive a reinicios y se comparte entre procesos
 *   3. Llamada a CoinGecko (via coingecko_client) y persistencia del resultado
 *
 * Si la API falla (429 u otro) usamos el snapshot mas reciente sin TTL como
 * ultimo recurso, devolviendo `source: 'db'`. Si no hay ni siquiera eso,
 * caemos a cache stale in-memory y por ultimo a `unsupported`.
 *
 * Symbols fuera de `CG_SYMBOL_TO_ID` se marcan `unsupported` sin consultar
 * DB ni gastar calls.
 *
 * Cambios respecto a GF-217: la firma pasa de `getPrices(symbols)` a
 * `getPrices(assets: AssetRef[])` porque necesitamos el `asset.id` para
 * mirar/insertar en `price_snapshots`. Todos los callers (portfolio_controller)
 * ya tienen el Asset cargado.
 */
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import env from '#start/env'
import PriceSnapshot from '#models/price_snapshot'
import { CG_SYMBOL_TO_ID } from './coingecko_symbol_map.js'
import { CoinGeckoRateLimitError, fetchSimplePrice } from './coingecko_client.js'

export type PriceSource = 'cache' | 'db' | 'coingecko' | 'unsupported'

export interface PriceResult {
  symbol: string
  price: number | null
  source: PriceSource
  fetchedAt: number | null
}

export interface AssetRef {
  id: string
  symbol: string
}

interface CacheEntry {
  price: number
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function memTtlMs(): number {
  return (env.get('COINGECKO_PRICE_TTL_SECONDS') ?? 60) * 1000
}

function dbTtlMs(): number {
  return (env.get('COINGECKO_DB_TTL_SECONDS') ?? 300) * 1000
}

export async function getPrices(assets: AssetRef[]): Promise<Record<string, PriceResult>> {
  const out: Record<string, PriceResult> = {}
  const now = Date.now()

  const candidates: Array<{ asset: AssetRef; cgId: string }> = []
  for (const a of assets) {
    const symbol = a.symbol.toUpperCase()
    if (out[symbol]) continue

    const cgId = CG_SYMBOL_TO_ID[symbol]
    if (!cgId) {
      out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
      continue
    }

    const cached = cache.get(symbol)
    if (cached && now - cached.fetchedAt < memTtlMs()) {
      out[symbol] = { symbol, price: cached.price, source: 'cache', fetchedAt: cached.fetchedAt }
      continue
    }

    candidates.push({ asset: a, cgId })
  }

  if (candidates.length === 0) return out

  const snapshots = await PriceSnapshot.query()
    .whereIn(
      'asset_id',
      candidates.map((c) => c.asset.id)
    )
    .orderBy('fetched_at', 'desc')

  const latestByAssetId = new Map<string, PriceSnapshot>()
  for (const s of snapshots) {
    if (!latestByAssetId.has(s.assetId)) latestByAssetId.set(s.assetId, s)
  }

  const toFetch: typeof candidates = []
  for (const c of candidates) {
    const symbol = c.asset.symbol.toUpperCase()
    const snap = latestByAssetId.get(c.asset.id)
    if (snap && now - snap.fetchedAt.toMillis() < dbTtlMs()) {
      const fetchedAt = snap.fetchedAt.toMillis()
      cache.set(symbol, { price: snap.price, fetchedAt })
      out[symbol] = { symbol, price: snap.price, source: 'db', fetchedAt }
      continue
    }
    toFetch.push(c)
  }

  if (toFetch.length === 0) return out

  try {
    const remote = await fetchSimplePrice(toFetch.map((c) => c.cgId))
    const newRows: Array<{
      assetId: string
      price: number
      currency: string
      provider: string
      fetchedAt: DateTime
    }> = []

    for (const c of toFetch) {
      const symbol = c.asset.symbol.toUpperCase()
      const price = remote[c.cgId]?.usd
      if (typeof price === 'number') {
        cache.set(symbol, { price, fetchedAt: now })
        newRows.push({
          assetId: c.asset.id,
          price,
          currency: 'USD',
          provider: 'coingecko',
          fetchedAt: DateTime.fromMillis(now),
        })
        out[symbol] = { symbol, price, source: 'coingecko', fetchedAt: now }
      } else {
        out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
        logger.warn({ symbol, id: c.cgId }, 'CoinGecko devolvio sin precio para id mapeado')
      }
    }

    if (newRows.length > 0) {
      await PriceSnapshot.createMany(newRows)
    }
  } catch (err) {
    if (err instanceof CoinGeckoRateLimitError) {
      logger.warn('CoinGecko rate limit; fallback a snapshot mas reciente sin TTL')
    } else {
      logger.error({ err }, 'CoinGecko fetch fallo; fallback a snapshot mas reciente sin TTL')
    }
    for (const c of toFetch) {
      const symbol = c.asset.symbol.toUpperCase()
      const snap = latestByAssetId.get(c.asset.id)
      if (snap) {
        const fetchedAt = snap.fetchedAt.toMillis()
        cache.set(symbol, { price: snap.price, fetchedAt })
        out[symbol] = { symbol, price: snap.price, source: 'db', fetchedAt }
        continue
      }
      const cached = cache.get(symbol)
      out[symbol] = cached
        ? { symbol, price: cached.price, source: 'cache', fetchedAt: cached.fetchedAt }
        : { symbol, price: null, source: 'unsupported', fetchedAt: null }
    }
  }

  return out
}

/**
 * Limpia el cache in-memory. Pensado para tests; no usar en runtime.
 */
export function _resetPriceCache(): void {
  cache.clear()
}
