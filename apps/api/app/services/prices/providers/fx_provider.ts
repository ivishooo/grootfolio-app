/**
 * fx_provider (GF-219). Provider de precios para activos tipo `currency` (ej.
 * el EUR del catalogo). A diferencia de crypto/stock, la "cotizacion" de una
 * divisa ES su tipo de cambio: el precio de 1 EUR es su valor en USD.
 *
 * Por eso delega en `fx_service.getRateToUsd` y devuelve la tasa ya en moneda
 * base (`{price: rateToUsd, currency: 'USD'}`), de modo que pasa derecho por el
 * filtro de USD del orquestador sin conversion extra. El symbol del activo es
 * el codigo ISO de la divisa (EUR, GBP, ARS, ...).
 *
 * El peso como divisa se valua al dolar BNA, no al CCL (ADR-0007): es el precio
 * al que se compran dolares en el banco.
 *
 * Variacion del dia (GF-019): tasa de hoy contra la de ayer (hora argentina),
 * con la misma fuente. Si la de ayer no es historica de verdad (`approx`), no
 * hay contra que comparar y queda null. El dolar vale 1 siempre: 0 %.
 */
import { getRateToUsd, getRateToUsdAt, type FxOptions } from '../fx/fx_service.js'
import { pctChange, previousIsoDateInZone } from '../day_change.js'
import type { AssetRef, PriceProvider, ProviderQuote } from './types.js'

const DIVISA: FxOptions = { ars: 'bna' }

async function dayChange(symbol: string, today: number): Promise<number | null> {
  if (symbol === 'USD') return 0
  const yesterday = await getRateToUsdAt(symbol, previousIsoDateInZone(Date.now()), DIVISA)
  if (!yesterday || yesterday.approx) return null
  return pctChange(today, yesterday.rate)
}

export const fxProvider: PriceProvider = {
  name: 'fx',
  async fetchQuotes(assets: AssetRef[]): Promise<Record<string, ProviderQuote | null>> {
    const out: Record<string, ProviderQuote | null> = {}

    for (const a of assets) {
      const symbol = a.symbol.toUpperCase()
      if (symbol in out) continue
      const rate = await getRateToUsd(symbol, DIVISA)
      out[symbol] =
        rate !== null
          ? { price: rate, currency: 'USD', dayChangePct: await dayChange(symbol, rate) }
          : null
    }

    return out
  },
}
