import type { AssetType, ContentType } from '../types'

/**
 * Etiquetas de tipo de activo, fuente única (M-09). Dos formas según contexto,
 * fieles al diseño (docs/design-reference):
 *  - `assetTypeLabels` (plural): categorías — chips de alta y leyenda de distribución.
 *  - `assetTypeLabel` (singular): un activo puntual — columna "Tipo" de la tabla/tarjetas.
 */
export const assetTypeLabels: Record<AssetType, string> = {
  crypto: 'Criptomonedas',
  stock: 'Acciones',
  bond: 'Bonos',
  currency: 'Divisas',
}

export const assetTypeLabel: Record<AssetType, string> = {
  crypto: 'Crypto',
  stock: 'Acción',
  bond: 'Bono',
  currency: 'Divisa',
}

/**
 * Monedas que la app sabe mostrar. `USD` es la de referencia: los importes
 * viajan siempre en USD desde la API y se convierten al vuelo para mostrarlos.
 */
export const SUPPORTED_CURRENCIES = ['USD', 'ARS', 'EUR'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export const currencyLabels: Record<SupportedCurrency, string> = {
  USD: 'Dolar estadounidense',
  ARS: 'Peso argentino',
  EUR: 'Euro',
}

/**
 * Cuantos decimales tiene sentido mostrar para un importe.
 *
 * Con `maximumFractionDigits: 0` fijo, un activo que cotiza a US$ 0,45 se
 * renderizaba como "US$ 0" y el usuario no podia distinguirlo de cero. La regla
 * es: de mil para arriba los centavos son ruido, abajo de uno son la
 * informacion (tipico en cripto).
 */
function fractionDigitsFor(value: number): number {
  const abs = Math.abs(value)
  if (abs >= 1000 || abs === 0) return 0
  if (abs >= 1) return 2
  if (abs >= 0.01) return 4
  return 8
}

export function formatCurrency(value: number | null | undefined, currency = 'USD', locale = 'es-AR'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const digits = fractionDigitsFor(value)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/**
 * Porcentaje con signo. Devuelve "—" cuando el dato no existe.
 *
 * El `null` importa: cuando una posicion no tiene base de costo (por ejemplo una
 * compra cargada a precio cero) la rentabilidad no es "0 %", es indefinida.
 * Mostrar "0,0 %" al lado de una ganancia de US$ 39.225 era lo que hacia la
 * version anterior, y se lee como un bug de calculo.
 */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  const n = value.toLocaleString('es-AR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return `${sign}${n}%`
}

/**
 * Porcentaje sin signo, para participaciones ("61,6 % del portafolio").
 *
 * Existe aparte de `formatPercent` porque aquel antepone "+" a los positivos,
 * que en una participacion no significa nada. Antes esto se resolvia con
 * `toFixed(1)`, que usa punto decimal: quedaba "61.6%" al lado de "+33,2%" en
 * la misma tarjeta.
 */
export function formatShare(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toLocaleString('es-AR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`
}

/**
 * Numero abreviado para los ejes de los graficos: 1500 -> "1,5k", 39224 -> "39,2k".
 *
 * La version anterior hacia `(v / 1000).toFixed(0) + 'k'`, asi que el tick de
 * 1.500 se rotulaba "2k" y el de 4.500 "5k": la etiqueta no coincidia con su
 * propia linea y se leia mal el grafico por hasta 500.
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`
  if (abs >= 1000) return `${(value / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`
  return value.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

/**
 * Fecha corta es-AR (31/07/2026). Fuente unica: antes cada pantalla lo resolvia
 * por su cuenta y dos de ellas llamaban a `toLocaleDateString()` sin locale, asi
 * que caian al del navegador y mostraban 7/31/2026 (formato de EE.UU.) al lado
 * de pantallas que mostraban 30/7/2026.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

/**
 * Valor de un `<input type="date">` ("2026-08-01") a ISO, respetando el dia que
 * el usuario eligio.
 *
 * `new Date('2026-08-01')` se parsea como medianoche UTC, que en Argentina
 * (-03:00) es el 31/07 a las 21:00: la operacion quedaba guardada un dia antes y
 * el desfasaje se propagaba al detalle, al grafico mensual y al ledger. Anclamos
 * al mediodia local, que ademas es inmune a los saltos de horario de verano.
 */
export function dateInputToISO(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString()
}

/** ISO a valor de `<input type="date">`, leyendo los componentes en hora local. */
export function isoToDateInput(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Calcula el precio promedio ponderado de un holding a partir de sus transacciones.
 * Las ventas ajustan la cantidad pero no el precio promedio (convencion elegida).
 */
export function averageCost(transactions: Array<{ kind: 'buy' | 'sell'; quantity: number; unitPrice: number; fee: number }>): {
  quantity: number
  avgPrice: number
} {
  let totalCost = 0
  let quantity = 0
  for (const t of transactions) {
    if (t.kind === 'buy') {
      totalCost += t.quantity * t.unitPrice + t.fee
      quantity += t.quantity
    } else {
      if (quantity > 0) {
        const costPerUnit = totalCost / quantity
        totalCost -= costPerUnit * t.quantity
      }
      quantity -= t.quantity
    }
  }
  return {
    quantity,
    avgPrice: quantity > 0 ? totalCost / quantity : 0,
  }
}

// ---- Admin / Contenidos (F4) ----

/** Etiqueta legible por tipo de contenido (chips y selectores). */
export const contentTypeLabels: Record<ContentType, string> = {
  doc: 'Documento',
  video: 'Video',
  image: 'Imagen',
  link: 'Enlace',
}

/** Tamaño de archivo legible (ej. "2,4 MB"). Base 1024, locale es-AR. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0
  return `${value.toLocaleString('es-AR', { maximumFractionDigits: digits })} ${units[unit]}`
}

/** Duración en segundos a "m:ss" o "h:mm:ss". */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—'
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * Texto de una suspensión: "por 24 horas" / "por 7 días" / "por 30 días" /
 * "indefinidamente" / "hasta 05/08/2026" (para `custom`).
 */
export function suspensionLabel(
  duration: '24h' | '7d' | '30d' | 'custom' | 'forever',
  until?: string | null
): string {
  switch (duration) {
    case '24h':
      return 'por 24 horas'
    case '7d':
      return 'por 7 días'
    case '30d':
      return 'por 30 días'
    case 'forever':
      return 'indefinidamente'
    case 'custom': {
      if (!until) return 'por un período'
      const d = new Date(until)
      return Number.isNaN(d.getTime()) ? 'por un período' : `hasta ${d.toLocaleDateString('es-AR')}`
    }
  }
}

/**
 * Agrupa las fuentes de una respuesta del asistente por artículo.
 *
 * El bot recupera *fragmentos*, y varios pueden salir del mismo artículo: con
 * la base de conocimiento completa es lo habitual. Mostrados sueltos, cada chip
 * lleva el nombre de una sección distinta del mismo texto y la fila se lee como
 * un menú de sugerencias en vez de como la cita de una fuente.
 *
 * Agrupados, cada artículo aparece una sola vez con su título, y las secciones
 * quedan disponibles para el tooltip. El orden lo da el mejor score de cada
 * artículo, que es el que decidió la respuesta.
 */
export interface GroupedChatSource {
  articleId: string
  title: string
  slug: string
  /** Secciones citadas de ese artículo, sin repetir y sin las vacías. */
  headings: string[]
  /** Mejor score entre los fragmentos del artículo. */
  score: number
}

export function groupSourcesByArticle(
  sources: Array<{
    articleId: string
    title: string
    slug: string
    heading: string | null
    score: number
  }>
): GroupedChatSource[] {
  const byArticle = new Map<string, GroupedChatSource>()

  for (const source of sources) {
    const existing = byArticle.get(source.articleId)
    if (!existing) {
      byArticle.set(source.articleId, {
        articleId: source.articleId,
        title: source.title,
        slug: source.slug,
        headings: source.heading ? [source.heading] : [],
        score: source.score,
      })
      continue
    }
    if (source.heading && !existing.headings.includes(source.heading)) {
      existing.headings.push(source.heading)
    }
    if (source.score > existing.score) existing.score = source.score
  }

  return [...byArticle.values()].sort((a, b) => b.score - a.score)
}
