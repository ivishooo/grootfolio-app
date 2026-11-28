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
 *
 * Variacion del dia (GF-019, ADR-0007): cada provider la devuelve junto con el
 * precio (`dayChangePct`) y viaja por el mismo camino: cache in-memory y
 * `price_snapshots.raw.dayChangePct`. Un snapshot de otro dia no aporta
 * variacion (seria la de ayer); ver `dayChangeFromRaw`.
 */
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import env from '#start/env'
import Asset from '#models/asset'
import PriceSnapshot from '#models/price_snapshot'
import { CoinGeckoRateLimitError, coingeckoProvider } from './providers/coingecko_provider.js'
import { yahooProvider } from './providers/yahoo_provider.js'
import { fxProvider } from './providers/fx_provider.js'
import { getRateToUsd } from './fx/fx_service.js'
import { convertToUsd } from './fx/fx_rates.js'
import type { AssetRef, PriceProvider, ProviderName } from './providers/types.js'
import { dayChangeFromRaw } from './day_change.js'

export type { AssetRef } from './providers/types.js'

export type PriceSource = 'cache' | 'db' | 'coingecko' | 'yahoo' | 'fx' | 'unsupported'

export interface PriceResult {
  symbol: string
  price: number | null
  source: PriceSource
  fetchedAt: number | null
  /** Variacion del dia en %; null si el provider no la da o no es de hoy. */
  dayChangePct: number | null
}

interface CacheEntry {
  price: number
  fetchedAt: number
  dayChangePct: number | null
}

const unsupported = (symbol: string): PriceResult => ({
  symbol,
  price: null,
  source: 'unsupported',
  fetchedAt: null,
  dayChangePct: null,
})

/** Lectura de un snapshot como resultado; la variacion solo si es de hoy. */
function fromSnapshot(symbol: string, snap: PriceSnapshot, now: number): PriceResult {
  const fetchedAt = snap.fetchedAt.toMillis()
  const dayChangePct = dayChangeFromRaw(snap.raw, fetchedAt, now)
  cache.set(symbol, { price: snap.price, fetchedAt, dayChangePct })
  return { symbol, price: snap.price, source: 'db', fetchedAt, dayChangePct }
}

function fromCache(symbol: string, c: CacheEntry, now: number): PriceResult {
  return {
    symbol,
    price: c.price,
    source: 'cache',
    fetchedAt: c.fetchedAt,
    // Mismo criterio que el snapshot: la variacion de otro dia no se sirve.
    dayChangePct: dayChangeFromRaw({ dayChangePct: c.dayChangePct }, c.fetchedAt, now),
  }
}

interface SnapshotRow {
  assetId: string
  price: number
  currency: string
  provider: string
  fetchedAt: DateTime
  raw: Record<string, unknown> | null
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

function snapshotRow(
  assetId: string,
  price: number,
  provider: ProviderName,
  now: number,
  dayChangePct: number | null
): SnapshotRow {
  return {
    assetId,
    price,
    currency: BASE_CURRENCY,
    provider,
    fetchedAt: DateTime.fromMillis(now),
    raw: dayChangePct === null ? null : { dayChangePct },
  }
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
      out[symbol] = unsupported(symbol)
      continue
    }

    const cached = cache.get(symbol)
    if (cached && now - cached.fetchedAt < memTtlMs()) {
      out[symbol] = fromCache(symbol, cached, now)
      continue
    }

    candidates.push({ asset: a, provider })
  }

  if (candidates.length === 0) return out

  // Paso 2: snapshot persistente con TTL
  // `is_historical` fuera: esos snapshots son cierres mensuales que persiste
  // price_history (GF-246) con fetched_at en el pasado. Sin este filtro, un
  // fallo de provider (que cae al snapshot mas reciente SIN TTL) podia servir
  // el cierre de un mes viejo como si fuera la cotizacion de hoy.
  const snapshots = await PriceSnapshot.query()
    .whereIn(
      'asset_id',
      candidates.map((c) => c.asset.id)
    )
    .where('is_historical', false)
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
      out[symbol] = fromSnapshot(symbol, snap, now)
      continue
    }
    const bucket = byProvider.get(c.provider)
    if (bucket) bucket.push({ asset: c.asset })
    else byProvider.set(c.provider, [{ asset: c.asset }])
  }

  if (byProvider.size === 0) return out

  // Paso 3: llamar a cada provider y persistir
  const newRows: SnapshotRow[] = []

  for (const [provider, items] of byProvider) {
    const refs = items.map((i) => i.asset)
    try {
      const quotes = await provider.fetchQuotes(refs)
      for (const item of items) {
        const symbol = item.asset.symbol.toUpperCase()
        const q = quotes[symbol]
        if (!q) {
          out[symbol] = unsupported(symbol)
          continue
        }
        // Normalizamos a USD base. Si el provider ya devuelve USD, priceUsd es
        // el mismo; si cotiza en otra moneda (ej. .BA en ARS) lo convertimos
        // via fx_service. Sin tasa disponible -> unsupported.
        let priceUsd = q.price
        if (q.currency !== BASE_CURRENCY) {
          const rate = await getRateToUsd(q.currency)
          if (rate === null) {
            out[symbol] = unsupported(symbol)
            logger.warn(
              { symbol, currency: q.currency, provider: provider.name },
              'Quote en moneda no base sin tasa FX disponible; marcado unsupported'
            )
            continue
          }
          priceUsd = convertToUsd(q.price, rate)
        }
        const dayChangePct = q.dayChangePct ?? null
        cache.set(symbol, { price: priceUsd, fetchedAt: now, dayChangePct })
        newRows.push(snapshotRow(item.asset.id, priceUsd, provider.name, now, dayChangePct))
        out[symbol] = {
          symbol,
          price: priceUsd,
          source: providerSource(provider.name),
          fetchedAt: now,
          dayChangePct,
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
          out[symbol] = fromSnapshot(symbol, snap, now)
          continue
        }
        const cached = cache.get(symbol)
        out[symbol] = cached ? fromCache(symbol, cached, now) : unsupported(symbol)
      }
    }
  }

  if (newRows.length > 0) {
    await PriceSnapshot.createMany(newRows)
  }

  return out
}

export interface RefreshSummary {
  refreshed: number
  unsupported: number
  failed: number
}

/**
 * Activos que aparecen en alguna cartera (con transacciones no borradas),
 * opcionalmente filtrados por tipo. Es el universo que el job periodico
 * refresca: no tiene sentido pedir precios de activos que nadie tiene (GF-221).
 */
export async function assetsInPortfolios(type?: AssetRef['type']): Promise<AssetRef[]> {
  const query = Asset.query().whereExists((sub) =>
    sub
      .from('transactions')
      .whereColumn('transactions.asset_id', 'asset_catalog.id')
      .whereNull('transactions.deleted_at')
  )
  if (type) query.where('type', type)
  const assets = await query
  return assets.map((a) => ({ id: a.id, symbol: a.symbol, type: a.type }))
}

/**
 * Refresca precios FORZANDO el fetch al provider (ignora cache y TTL), persiste
 * un snapshot nuevo por activo y actualiza el cache in-memory. Lo usa el job
 * periodico (GF-221); `getPrices` sigue con su cascada con TTL para las
 * requests de los usuarios. A diferencia de `getPrices`, ante un fallo de
 * provider no hay fallback: se loguea y se cuenta como `failed`.
 */
export async function refreshPrices(assets: AssetRef[]): Promise<RefreshSummary> {
  const now = Date.now()
  const summary: RefreshSummary = { refreshed: 0, unsupported: 0, failed: 0 }

  const byProvider = new Map<PriceProvider, AssetRef[]>()
  for (const a of assets) {
    const provider = PROVIDER_BY_TYPE[a.type]
    if (!provider) {
      summary.unsupported++
      continue
    }
    const bucket = byProvider.get(provider)
    if (bucket) bucket.push(a)
    else byProvider.set(provider, [a])
  }

  const newRows: SnapshotRow[] = []

  for (const [provider, items] of byProvider) {
    try {
      const quotes = await provider.fetchQuotes(items)
      for (const asset of items) {
        const symbol = asset.symbol.toUpperCase()
        const q = quotes[symbol]
        if (!q) {
          summary.unsupported++
          continue
        }
        let priceUsd = q.price
        if (q.currency !== BASE_CURRENCY) {
          const rate = await getRateToUsd(q.currency)
          if (rate === null) {
            summary.unsupported++
            continue
          }
          priceUsd = convertToUsd(q.price, rate)
        }
        const dayChangePct = q.dayChangePct ?? null
        cache.set(symbol, { price: priceUsd, fetchedAt: now, dayChangePct })
        newRows.push(snapshotRow(asset.id, priceUsd, provider.name, now, dayChangePct))
        summary.refreshed++
      }
    } catch (err) {
      logger.error({ err, provider: provider.name }, 'refreshPrices: fallo el provider')
      summary.failed += items.length
    }
  }

  if (newRows.length > 0) {
    await PriceSnapshot.createMany(newRows)
  }

  return summary
}

/**
 * Limpia el cache in-memory. Pensado para tests; no usar en runtime.
 */
export function _resetPriceCache(): void {
  cache.clear()
}
