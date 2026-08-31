/**
 * Moneda de visualización (espejo de `apps/web/src/lib/money.ts`).
 *
 * Todo lo que devuelve la API está en USD. El usuario elige en Configuración en
 * qué moneda quiere leerlo y acá se convierte al vuelo, sin tocar el motor de
 * cálculo del backend: una sola fuente de verdad para los números, una capa de
 * presentación arriba.
 *
 * Si la cotización todavía no llegó, o la moneda elegida no se pudo cotizar, se
 * muestra en USD. Nunca se inventa un factor de conversión: un importe con la
 * etiqueta equivocada es peor que un importe en otra moneda.
 */
import { formatCurrency } from '@grootfolio/shared'
import { useAuth } from '@/auth/AuthProvider'
import { useFxRates } from './queries'

export interface Money {
  /** Moneda efectiva en la que se está mostrando (puede ser USD por fallback). */
  currency: string
  /** Moneda que el usuario eligió, aunque todavía no haya cotización. */
  preferred: string
  /** Unidades de `currency` por 1 USD. 1 cuando se muestra en USD. */
  rate: number
  /** `true` cuando se pidió otra moneda pero se está mostrando en USD igual. */
  isFallback: boolean
  /** Formatea un importe expresado en USD. */
  format: (usd: number | null | undefined) => string
  /** Convierte un importe en USD a la moneda de visualización, sin formatear. */
  convert: (usd: number) => number
}

export function useMoney(): Money {
  const { user } = useAuth()
  const { data } = useFxRates()

  const preferred = (user?.baseCurrency ?? 'USD').toUpperCase()
  const rate = preferred === 'USD' ? 1 : data?.rates?.[preferred]
  const resolved = rate && rate > 0 ? rate : 1
  const currency = rate && rate > 0 ? preferred : 'USD'

  return {
    currency,
    preferred,
    rate: resolved,
    isFallback: preferred !== 'USD' && currency === 'USD',
    convert: (usd: number) => usd * resolved,
    format: (usd) =>
      usd === null || usd === undefined || !Number.isFinite(usd)
        ? '—'
        : formatCurrency(usd * resolved, currency),
  }
}
