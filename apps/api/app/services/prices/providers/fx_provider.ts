/**
 * fx_provider (GF-219). Provider de precios para activos tipo `currency` (ej.
 * el EUR del catalogo). A diferencia de crypto/stock, la "cotizacion" de una
 * divisa ES su tipo de cambio: el precio de 1 EUR es su valor en USD.
 *
 * Por eso delega en `fx_service.getRateToUsd` y devuelve la tasa ya en moneda
 * base (`{price: rateToUsd, currency: 'USD'}`), de modo que pasa derecho por el
 * filtro de USD del orquestador sin conversion extra. El symbol del activo es
 * el codigo ISO de la divisa (EUR, GBP, ARS, ...).
 */
import { getRateToUsd } from '../fx/fx_service.js'
import type { AssetRef, PriceProvider, ProviderQuote } from './types.js'

export const fxProvider: PriceProvider = {
  name: 'fx',
  async fetchQuotes(assets: AssetRef[]): Promise<Record<string, ProviderQuote | null>> {
    const out: Record<string, ProviderQuote | null> = {}

    for (const a of assets) {
      const symbol = a.symbol.toUpperCase()
      if (symbol in out) continue
      const rate = await getRateToUsd(symbol)
      out[symbol] = rate !== null ? { price: rate, currency: 'USD' } : null
    }

    return out
  },
}
