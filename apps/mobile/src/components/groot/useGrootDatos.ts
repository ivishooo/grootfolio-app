/**
 * Datos para `grootContenido()` armados en el cliente con lo que la app ya
 * consulta (ADR-0004 / ADR-0006): nada de esto pasa por el LLM.
 */
import { useMemo } from 'react'
import { BAJA_FUERTE, CRIPTO_SUGERIDA, type GrootDatos, type Holding, type RiskProfileType } from '@grootfolio/shared'
import { useContentItems, usePortfolio, useQuizResult, useReportSummary } from '@/lib/queries'
import { useMoney } from '@/lib/money'
import type { GrootLastTx } from './GrootProvider'

const PROFILE_LABEL: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

/**
 * Cuánto restó un holding hoy, en moneda base: su valor de hoy menos el de
 * ayer (`value / (1 + pct/100)`). Sin variación, 0.
 */
function aporteDelDia(h: Holding): number {
  if (h.dayChangePercent === null || h.value <= 0) return 0
  return h.value - h.value / (1 + h.dayChangePercent / 100)
}

/** `ready`: el portafolio ya cargó. Antes de eso la burbuja diría «vale US$ 0». */
export function useGrootDatos(lastTx: GrootLastTx | null): { datos: GrootDatos; dayPct: number | null; ready: boolean } {
  const money = useMoney()
  const { data: portfolio } = usePortfolio()
  const { data: report } = useReportSummary()
  const { data: quiz } = useQuizResult()
  const { data: content } = useContentItems()

  return useMemo(() => {
    const holdings = portfolio?.holdings ?? []
    const conPct = holdings.filter((h) => h.pnlPercent !== null)
    const top = conPct.reduce<(typeof conPct)[number] | undefined>((a, h) => (!a || h.pnlPercent! > a.pnlPercent! ? h : a), undefined)
    const bottom = conPct.reduce<(typeof conPct)[number] | undefined>((a, h) => (!a || h.pnlPercent! < a.pnlPercent! ? h : a), undefined)

    // Ventas de este año: puntos de la serie realizada con fecha del año en curso.
    const year = new Date().getFullYear()
    const series = report?.realizedSeries ?? []
    const thisYear = series.filter((p) => new Date(p.date).getFullYear() === year)
    const before = series.filter((p) => new Date(p.date).getFullYear() < year).at(-1)?.cumulative ?? 0
    const amountThisYear = (thisYear.at(-1)?.cumulative ?? before) - before

    const nuevos = (content ?? []).filter((c) => c.isNew)
    const destacado = nuevos.find((c) => c.pinned) ?? nuevos[0]

    const total = portfolio?.totalValue ?? 0
    const crypto = portfolio?.distribution.find((d) => d.type === 'crypto')?.value ?? 0

    // Variación del día de GET /portfolio (GF-019). `null` = sin dato: Groot dice el valor y avisa.
    const dayPct: number | null = portfolio?.dayChangePercent ?? null

    // En un día de baja fuerte, «X explica casi toda la baja» tiene que nombrar al
    // que más restó hoy, no al que está más abajo del costo.
    const peorDelDia =
      dayPct !== null && dayPct <= BAJA_FUERTE
        ? holdings.reduce<Holding | undefined>((a, h) => (aporteDelDia(h) < (a ? aporteDelDia(a) : 0) ? h : a), undefined)
        : undefined

    const datos: GrootDatos = {
      totalValue: money.format(total),
      dayPct,
      topUp: top && top.pnlPercent! > 0 ? top.asset.name : undefined,
      topDown: peorDelDia ? peorDelDia.asset.name : bottom && bottom.pnlPercent! < 0 ? bottom.asset.name : undefined,
      lastTx: lastTx ? { ...lastTx, positions: holdings.length } : undefined,
      realized: { year, sells: thisYear.length, amount: money.format(amountThisYear) },
      newContent: destacado
        ? {
            count: nuevos.length,
            title: destacado.title,
            minutes: destacado.durationSeconds ? Math.max(1, Math.round(destacado.durationSeconds / 60)) : null,
          }
        : { count: 0, title: '', minutes: null },
      profile: quiz
        ? {
            label: PROFILE_LABEL[quiz.profile],
            cryptoNow: total > 0 ? Math.round((crypto / total) * 100) : 0,
            cryptoSuggested: CRIPTO_SUGERIDA[quiz.profile],
          }
        : undefined,
    }
    return { datos, dayPct, ready: portfolio !== undefined }
  }, [portfolio, report, quiz, content, lastTx, money])
}
