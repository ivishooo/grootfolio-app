/**
 * Tipos de dominio compartidos entre backend, web y mobile.
 */

export type AssetType = 'crypto' | 'stock' | 'bond' | 'currency'

export type RiskProfileType = 'conservative' | 'moderate' | 'aggressive'

export interface User {
  id: string
  email: string
  fullName: string | null
  riskProfile: RiskProfileType | null
  createdAt: string
}

export interface Asset {
  id: string
  symbol: string
  name: string
  type: AssetType
  currency: string
  iconUrl?: string
}

/**
 * Resultado del autocomplete de activos (GET /assets/search). No incluye `id`
 * porque puede venir del catalogo o de un proveedor externo aun no persistido;
 * el alta se sigue resolviendo por symbol+type.
 */
export interface AssetSearchResult {
  symbol: string
  name: string
  type: AssetType
  currency: string
}

export interface Transaction {
  id: string
  userId: string
  assetId: string
  kind: 'buy' | 'sell'
  quantity: number
  unitPrice: number
  fee: number
  priceCurrency: string
  purchasedAt: string
  notes?: string
}

export interface Holding {
  assetId: string
  asset: Asset
  quantity: number
  avgPrice: number
  currentPrice: number
  value: number
  pnl: number
  pnlPercent: number
}

export interface PortfolioSummary {
  totalValue: number
  pnlAbsolute: number
  pnlPercent: number
  bestAsset: (Asset & { pnlPercent: number }) | null
  distribution: Array<{ type: AssetType; value: number }>
  monthlyReturn: Array<{ month: string; value: number }>
  holdings: Holding[]
}

// ---- Reportes (GF-250, Fase F) ----

/**
 * Entrada del ledger (GET /reports/transactions): una transaccion con su
 * valuacion en USD. `amountUsd` es el costo (compra) o el ingreso bruto (venta),
 * neto de fee. `usdApprox` marca que el FX usado no es exactamente el de la
 * fecha (degradado a la tasa disponible mas cercana).
 */
export interface LedgerEntry {
  id: string
  assetId: string
  symbol: string
  name: string
  type: AssetType
  kind: 'buy' | 'sell'
  quantity: number
  unitPrice: number
  priceCurrency: string
  fee: number
  unitPriceUsd: number
  feeUsd: number
  amountUsd: number
  purchasedAt: string
  usdApprox: boolean
}

/** P&L realizado acumulado por activo (incluye posiciones ya cerradas). */
export interface RealizedPnl {
  assetId: string
  symbol: string
  name: string
  type: AssetType
  realized: number
  proceeds: number
  costBasis: number
  quantitySold: number
}

/** Punto de la serie de P&L realizado acumulado (uno por venta). */
export interface RealizedPoint {
  date: string
  cumulative: number
}

/**
 * Punto del balance historico mark-to-market. `estimated` indica que faltaron
 * snapshots historicos para algun activo del mes y el valor puede ser parcial.
 */
export interface HistoricalBalancePoint {
  month: string
  value: number
  estimated: boolean
}

export interface ReportSummary {
  realizedTotal: number
  realizedByAsset: RealizedPnl[]
  realizedSeries: RealizedPoint[]
  historicalBalance: HistoricalBalancePoint[]
}

export interface QuizOption {
  id: string
  label: string
  score: number
}

export interface QuizQuestion {
  id: string
  order: number
  text: string
  options: QuizOption[]
}

export interface RiskProfileResult {
  profile: RiskProfileType
  score: number
  description: string
  recommendations: string[]
  calculatedAt: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
