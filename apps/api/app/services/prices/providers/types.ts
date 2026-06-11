/**
 * Contrato comun para todos los proveedores de precios (CoinGecko, Yahoo,
 * Frankfurter en GF-219). Cada proveedor mapea sus propios symbols, llama a
 * su API y devuelve una cotizacion `{price, currency}` o `null` si el symbol
 * no esta soportado por ese provider. El cache (in-memory + price_snapshots)
 * y el routing por `asset.type` viven en el orquestador (price_service).
 */
export interface ProviderQuote {
  price: number
  currency: string
}

export interface AssetRef {
  id: string
  symbol: string
  type: 'crypto' | 'stock' | 'bond' | 'currency'
}

export type ProviderName = 'coingecko' | 'yahoo'

export interface PriceProvider {
  readonly name: ProviderName
  fetchQuotes(assets: AssetRef[]): Promise<Record<string, ProviderQuote | null>>
}
