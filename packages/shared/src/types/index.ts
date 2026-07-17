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
