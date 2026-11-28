/**
 * Chip «▲ 1,2 % hoy» (GF-019): variación del día de la cartera o de un activo,
 * con el `dayChangePercent` de GET /portfolio. Sin dato (`null`) no se dibuja:
 * un «0 %» diría que no se movió, y eso no lo sabemos.
 */
import { formatPctArrow } from '@grootfolio/shared'

export function DayChip({ pct, size = 'md', testId }: { pct: number | null | undefined; size?: 'sm' | 'md'; testId?: string }) {
  if (pct === null || pct === undefined) return null
  const up = pct >= 0
  const tone = up ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold tabular-nums ${tone} ${pad}`}
      aria-label={`${up ? 'Subió' : 'Bajó'} ${Math.abs(pct).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % hoy`}
    >
      {formatPctArrow(pct)} hoy
    </span>
  )
}
