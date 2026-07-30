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

export function formatCurrency(value: number, currency = 'USD', locale = 'es-AR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, fractionDigits = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(fractionDigits)}%`
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
