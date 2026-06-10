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
