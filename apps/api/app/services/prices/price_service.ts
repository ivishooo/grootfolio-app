/**
 * price_service. Orquestador de precios con cascada de tres niveles
 * (cache in-memory → snapshot persistente → provider externo) y routing
 * por `asset.type` al provider correspondiente:
 *
 *   crypto   → coingeckoProvider (GF-217)
 *   stock    → yahooProvider     (GF-218)
 *   currency → fxProvider        (GF-219)
 *   bond                         → unsupported hasta futuras stories
 *
 * Cache (`COINGECKO_PRICE_TTL_SECONDS`, default 60s) y persistencia
 * (`COINGECKO_DB_TTL_SECONDS`, default 300s) se aplican parejo a todos
 * los providers; el nombre de la var arrastra "COINGECKO" por historia
 * de GF-217 pero el TTL es del orquestador, no del provider.
 *
 * Moneda base: USD. Si un provider devuelve `{price, currency}` en otra moneda
 * (los tickers .BA en Yahoo cotizan en ARS) convertimos a USD via fx_service
 * (GF-219) y persistimos el snapshot ya en USD. Si no hay tasa de cambio
 * disponible, recien ahi marcamos `unsupported` con warning.
 *
 * Si un provider falla (rate limit u otro), caemos al snapshot mas reciente
 * sin TTL (`source: 'db'`); si no hay snapshot, cache in-memory stale; ultimo
 * recurso `unsupported`.
 */
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import env from '#start/env'
import PriceSnapshot from '#models/price_snapshot'
import { CoinGeckoRateLimitError, coingeckoProvider } from './providers/coingecko_provider.js'
import { yahooProvider } from './providers/yahoo_provider.js'
import { fxProvider } from './providers/fx_provider.js'
import { getRateToUsd } from './fx/fx_service.js'
import { convertToUsd } from './fx/fx_rates.js'
import type { AssetRef, PriceProvider, ProviderName } from './providers/types.js'

export type { AssetRef } from './providers/types.js'

export type PriceSource = 'cache' | 'db' | 'coingecko' | 'yahoo' | 'fx' | 'unsupported'

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

const BASE_CURRENCY = 'USD'

const PROVIDER_BY_TYPE: Partial<Record<AssetRef['type'], PriceProvider>> = {
  crypto: coingeckoProvider,
  stock: yahooProvider,
  currency: fxProvider,
}

const cache = new Map<string, CacheEntry>()

function memTtlMs(): number {
  return (env.get('COINGECKO_PRICE_TTL_SECONDS') ?? 60) * 1000
}

function dbTtlMs(): number {
  return (env.get('COINGECKO_DB_TTL_SECONDS') ?? 300) * 1000
}

function providerSource(name: ProviderName): PriceSource {
  return name
}

export async function getPrices(assets: AssetRef[]): Promise<Record<string, PriceResult>> {
  const out: Record<string, PriceResult> = {}
  const now = Date.now()

  // Paso 1: cache in-memory + descartar tipos sin provider
  const candidates: Array<{ asset: AssetRef; provider: PriceProvider }> = []
  for (const a of assets) {
    const symbol = a.symbol.toUpperCase()
    if (out[symbol]) continue

    const provider = PROVIDER_BY_TYPE[a.type]
    if (!provider) {
      out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
      continue
    }

    const cached = cache.get(symbol)
    if (cached && now - cached.fetchedAt < memTtlMs()) {
      out[symbol] = { symbol, price: cached.price, source: 'cache', fetchedAt: cached.fetchedAt }
      continue
    }

    candidates.push({ asset: a, provider })
  }

  if (candidates.length === 0) return out

  // Paso 2: snapshot persistente con TTL
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

  const byProvider = new Map<PriceProvider, Array<{ asset: AssetRef }>>()
  for (const c of candidates) {
    const symbol = c.asset.symbol.toUpperCase()
    const snap = latestByAssetId.get(c.asset.id)
    if (snap && now - snap.fetchedAt.toMillis() < dbTtlMs()) {
      const fetchedAt = snap.fetchedAt.toMillis()
      cache.set(symbol, { price: snap.price, fetchedAt })
      out[symbol] = { symbol, price: snap.price, source: 'db', fetchedAt }
      continue
    }
    const bucket = byProvider.get(c.provider)
    if (bucket) bucket.push({ asset: c.asset })
    else byProvider.set(c.provider, [{ asset: c.asset }])
  }

  if (byProvider.size === 0) return out

  // Paso 3: llamar a cada provider y persistir
  const newRows: Array<{
    assetId: string
    price: number
    currency: string
    provider: string
    fetchedAt: DateTime
  }> = []

  for (const [provider, items] of byProvider) {
    const refs = items.map((i) => i.asset)
    try {
      const quotes = await provider.fetchQuotes(refs)
      for (const item of items) {
        const symbol = item.asset.symbol.toUpperCase()
        const q = quotes[symbol]
        if (!q) {
          out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
          continue
        }
        // Normalizamos a USD base. Si el provider ya devuelve USD, priceUsd es
        // el mismo; si cotiza en otra moneda (ej. .BA en ARS) lo convertimos
        // via fx_service. Sin tasa disponible -> unsupported.
        let priceUsd = q.price
        if (q.currency !== BASE_CURRENCY) {
          const rate = await getRateToUsd(q.currency)
          if (rate === null) {
            out[symbol] = { symbol, price: null, source: 'unsupported', fetchedAt: null }
            logger.warn(
              { symbol, currency: q.currency, provider: provider.name },
              'Quote en moneda no base sin tasa FX disponible; marcado unsupported'
            )
            continue
          }
          priceUsd = convertToUsd(q.price, rate)
        }
        cache.set(symbol, { price: priceUsd, fetchedAt: now })
        newRows.push({
          assetId: item.asset.id,
          price: priceUsd,
          currency: BASE_CURRENCY,
          provider: provider.name,
          fetchedAt: DateTime.fromMillis(now),
        })
        out[symbol] = {
          symbol,
          price: priceUsd,
          source: providerSource(provider.name),
          fetchedAt: now,
        }
      }
    } catch (err) {
      if (err instanceof CoinGeckoRateLimitError) {
        logger.warn({ provider: provider.name }, 'Provider rate limit; fallback a snapshot sin TTL')
      } else {
        logger.error({ err, provider: provider.name }, 'Provider fetch fallo; fallback a snapshot sin TTL')
      }
      for (const item of items) {
        const symbol = item.asset.symbol.toUpperCase()
        const snap = latestByAssetId.get(item.asset.id)
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
  }

  if (newRows.length > 0) {
    await PriceSnapshot.createMany(newRows)
  }

  return out
}

/**
 * Limpia el cache in-memory. Pensado para tests; no usar en runtime.
 */
export function _resetPriceCache(): void {
  cache.clear()
}
