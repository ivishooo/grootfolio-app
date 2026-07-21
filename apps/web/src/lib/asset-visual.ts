/**
 * Identidad visual por tipo de activo (rediseño GF).
 * Colores de acento consistentes en claro y oscuro (se usan como estilo inline;
 * no dependen de Tailwind). Fuente única para avatares, chips y barras.
 */
import type { AssetType } from '@grootfolio/shared'

export const ASSET_COLORS: Record<AssetType, { accent: string; soft: string }> = {
  crypto: { accent: '#F97316', soft: 'rgba(249,115,22,0.12)' },
  stock: { accent: '#3B82F6', soft: 'rgba(59,130,246,0.12)' },
  bond: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.12)' },
  currency: { accent: '#14B8A6', soft: 'rgba(20,184,166,0.12)' },
}

export function assetColor(type: AssetType) {
  return ASSET_COLORS[type] ?? ASSET_COLORS.crypto
}

// Glyphs conocidos; el resto usa las 1-2 primeras letras del symbol/nombre.
const MARKS: Record<string, string> = { BTC: '₿', ETH: 'Ξ', USD: '$', EUR: '€' }

export function assetMark(a: { symbol?: string; name?: string }): string {
  const sym = (a.symbol || a.name || '?').toUpperCase()
  if (MARKS[sym]) return MARKS[sym]
  return sym.replace(/[^A-Z0-9$₿Ξ€]/g, '').slice(0, 2) || '?'
}
