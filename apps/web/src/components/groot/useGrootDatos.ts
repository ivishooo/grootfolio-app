/**
 * Datos para `grootContenido()` armados en el cliente con lo que la app ya
 * consulta (ADR-0004 / ADR-0006): nada de esto pasa por el LLM.
 */
import { useMemo } from 'react'
import { CRIPTO_SUGERIDA, type GrootDatos, type RiskProfileType } from '@grootfolio/shared'
import { useContentItems, usePortfolio, useQuizResult, useReportSummary } from '@/lib/queries'
import { useMoney } from '@/lib/money'
import type { GrootLastTx } from './GrootProvider'

const PROFILE_LABEL: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

export function useGrootDatos(lastTx: GrootLastTx | null): { datos: GrootDatos; dayPct: number | null } {
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

    // Sin `dayChangePercent` en GET /portfolio todavía: Groot dice el valor sin la variación.
    const dayPct: number | null = null

    const datos: GrootDatos = {
      totalValue: money.format(total),
      dayPct,
      topUp: top && top.pnlPercent! > 0 ? top.asset.name : undefined,
      topDown: bottom && bottom.pnlPercent! < 0 ? bottom.asset.name : undefined,
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
    return { datos, dayPct }
  }, [portfolio, report, quiz, content, lastTx, money])
}
