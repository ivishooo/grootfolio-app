/**
 * Cliente HTTP minimo para CoinGecko. Una sola operacion expuesta:
 * `fetchSimplePrice(ids)` que dispara `/simple/price` con vs_currencies=usd
 * y devuelve el mapa crudo. El cache y el mapeo symbol→id viven en price_service.
 *
 * Si COINGECKO_API_KEY esta configurada, se manda el header `x-cg-demo-api-key`
 * (plan Demo gratuito: 30 calls/min, 10k/mes); sin key cae al tier free public
 * con rate limits mas bajos.
 *
 * Errores: 429 levanta CoinGeckoRateLimitError para que el caller decida
 * fallback; cualquier otro status no-ok levanta Error generico con el body.
 */
import env from '#start/env'

const BASE_URL = 'https://api.coingecko.com/api/v3'

export type SimplePriceResponse = Record<string, { usd?: number } | undefined>

export class CoinGeckoRateLimitError extends Error {
  constructor(message = 'CoinGecko rate limit (HTTP 429)') {
    super(message)
    this.name = 'CoinGeckoRateLimitError'
  }
}

export async function fetchSimplePrice(coingeckoIds: string[]): Promise<SimplePriceResponse> {
  if (coingeckoIds.length === 0) return {}

  const url = new URL(`${BASE_URL}/simple/price`)
  url.searchParams.set('ids', coingeckoIds.join(','))
  url.searchParams.set('vs_currencies', 'usd')

  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = env.get('COINGECKO_API_KEY')
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey

  const res = await fetch(url, { headers })

  if (res.status === 429) {
    throw new CoinGeckoRateLimitError()
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CoinGecko HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  return (await res.json()) as SimplePriceResponse
}

export interface MarketChartPoint {
  timestamp: number
  price: number
}

/**
 * Historico de precios de un activo via `/coins/{id}/market_chart`. Para
 * `days > 90` CoinGecko devuelve granularidad diaria automaticamente; NO
 * pasamos `interval=daily` porque esta restringido a planes pagos en el tier
 * free. Lo usa la reconstruccion del monthlyReturn (GF-246).
 */
export async function fetchMarketChart(
  coingeckoId: string,
  days: number
): Promise<MarketChartPoint[]> {
  const url = new URL(`${BASE_URL}/coins/${coingeckoId}/market_chart`)
  url.searchParams.set('vs_currency', 'usd')
  url.searchParams.set('days', String(days))

  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = env.get('COINGECKO_API_KEY')
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey

  const res = await fetch(url, { headers })
  if (res.status === 429) {
    throw new CoinGeckoRateLimitError()
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CoinGecko market_chart HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as { prices?: Array<[number, number]> }
  return (data.prices ?? []).map(([timestamp, price]) => ({ timestamp, price }))
}

export interface CoinSearchHit {
  symbol: string
  name: string
}

/**
 * Busqueda de criptos via `/search?query=` (GF-248 D.2). Devuelve coins
 * ordenadas por market cap; nos quedamos con symbol+name para el autocomplete.
 * 429 levanta CoinGeckoRateLimitError; otros no-ok, Error generico.
 */
export async function searchCoins(query: string): Promise<CoinSearchHit[]> {
  const url = new URL(`${BASE_URL}/search`)
  url.searchParams.set('query', query)

  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = env.get('COINGECKO_API_KEY')
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey

  const res = await fetch(url, { headers })
  if (res.status === 429) {
    throw new CoinGeckoRateLimitError()
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CoinGecko search HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    coins?: Array<{ symbol?: string; name?: string }>
  }
  return (data.coins ?? [])
    .filter((c): c is { symbol: string; name: string } => Boolean(c.symbol && c.name))
    .map((c) => ({ symbol: c.symbol.toUpperCase(), name: c.name }))
}
