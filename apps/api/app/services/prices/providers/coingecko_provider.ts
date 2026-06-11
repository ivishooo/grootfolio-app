/**
 * coingecko_provider (GF-218). Wrapper de la logica de CoinGecko que vive en
 * `coingecko_client` + `coingecko_symbol_map` detras del contrato comun
 * `PriceProvider`. Sin cambios funcionales respecto a GF-217/GF-220: misma
 * tabla SYMBOL→id curada, mismo manejo de rate-limit (CoinGeckoRateLimitError
 * se sigue exportando para que el orquestador decida el fallback).
 */
import { CoinGeckoRateLimitError, fetchSimplePrice } from '../coingecko_client.js'
import { CG_SYMBOL_TO_ID } from '../coingecko_symbol_map.js'
import type { AssetRef, PriceProvider, ProviderQuote } from './types.js'

export const coingeckoProvider: PriceProvider = {
  name: 'coingecko',
  async fetchQuotes(assets: AssetRef[]): Promise<Record<string, ProviderQuote | null>> {
    const out: Record<string, ProviderQuote | null> = {}
    const idToSymbol = new Map<string, string>()
    const ids: string[] = []

    for (const a of assets) {
      const symbol = a.symbol.toUpperCase()
      if (symbol in out) continue
      const id = CG_SYMBOL_TO_ID[symbol]
      if (!id) {
        out[symbol] = null
        continue
      }
      idToSymbol.set(id, symbol)
      ids.push(id)
    }

    if (ids.length === 0) return out

    const remote = await fetchSimplePrice(ids)
    for (const id of ids) {
      const symbol = idToSymbol.get(id)!
      const price = remote[id]?.usd
      out[symbol] = typeof price === 'number' ? { price, currency: 'USD' } : null
    }
    return out
  },
}

export { CoinGeckoRateLimitError }
