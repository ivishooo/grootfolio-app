import type { AssetType } from '../types'

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
