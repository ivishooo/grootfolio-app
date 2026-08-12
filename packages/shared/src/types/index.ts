/**
 * Tipos de dominio compartidos entre backend, web y mobile.
 */

export type AssetType = 'crypto' | 'stock' | 'bond' | 'currency'

export type RiskProfileType = 'conservative' | 'moderate' | 'aggressive'

// ---- Admin / Contenidos (F4) ----
export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'suspended'
export type ContentType = 'doc' | 'video' | 'image' | 'link'
export type ContentStatus = 'draft' | 'published'
export type NotificationType = 'content.published' | 'profile.moderated' | 'account.suspended'

export interface User {
  id: string
  email: string
  fullName: string | null
  riskProfile: RiskProfileType | null
  role: UserRole
  avatarUrl: string | null
  status: UserStatus
  suspendedUntil?: string | null
  suspendedReason?: string | null
  createdAt: string
}

/** Fila de la tabla de admin: usuario + métricas de su cartera. */
export interface AdminUserRow extends User {
  portfolioValue: number
  transactionsCount: number
}

export interface AdminUserStats {
  total: number
  active: number
  suspended: number
  newLast30d: number
}

export interface AuditLogEntry {
  id: string
  actorName: string
  action: string
  targetLabel: string
  reason: string | null
  createdAt: string
}

export interface ContentSection {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
  itemsCount: number
}

export interface ContentItem {
  id: string
  sectionId: string
  sectionName: string
  type: ContentType
  title: string
  description: string | null
  url: string | null
  sizeBytes: number | null
  durationSeconds: number | null
  status: ContentStatus
  pinned: boolean
  viewsCount: number
  publishedAt: string | null
  isNew: boolean
}

// ---- Chatbot RAG — base de conocimiento (F2) ----

export type KbArticleStatus = 'draft' | 'published'

/**
 * Artículo de la base de conocimiento que alimenta al chatbot. `body` es
 * markdown. El bloque de indexación describe el estado de la vectorización:
 * `indexed` es true cuando el artículo tiene fragmentos vectorizados vigentes,
 * e `indexingError` trae el motivo del último fallo (null si la última salió
 * bien). Un artículo puede estar publicado y no indexado si falló la ingesta.
 */
export interface KbArticle {
  id: string
  title: string
  slug: string
  body: string
  status: KbArticleStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  chunksCount: number
  indexed: boolean
  indexedAt: string | null
  indexingError: string | null
}

/**
 * Fila del listado de artículos: igual que `KbArticle` pero sin el markdown
 * completo (el detalle lo trae). Evita mandar cuerpos largos en la lista.
 */
export interface KbArticleListItem extends Omit<KbArticle, 'body'> {
  excerpt: string
  bodyLength: number
}

/** Totales de la KB. Son globales: no dependen de los filtros del listado. */
export interface KbStats {
  total: number
  published: number
  draft: number
}

// ---- Chatbot RAG — conversación (F4) ----

/** Fragmento de la KB que respaldó una respuesta del bot. */
export interface ChatSource {
  articleId: string
  title: string
  slug: string
  heading: string | null
  score: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /**
   * Sólo en mensajes del bot: `true` si respondió con respaldo documental,
   * `false` si devolvió el fallback por estar fuera de alcance.
   */
  grounded: boolean | null
  sources: ChatSource[]
  createdAt: string
}

export interface ChatConversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

/** Respuesta de POST /chat. `remaining` son las preguntas que quedan en la hora. */
export interface ChatAnswer {
  conversationId: string
  messageId: string
  answer: string
  grounded: boolean
  sources: ChatSource[]
  remaining: number
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  readAt: string | null
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
