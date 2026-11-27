/**
 * Perfil de inversor · resultado (rediseño v2, Fase 5). SPEC-pantallas › Perfil.
 * «Tu perfil es» + pastilla en tinta invertida, medidor neutro de 3 segmentos
 * (ya no pinta Moderado de naranja ni Conservador de azul), la descripción y
 * «Tu cartera vs. la sugerida»: lo que tenés hoy sobre la sugerida al 30 %.
 */
import { useNavigate } from 'react-router-dom'
import { ASIGNACION_SUGERIDA, formatDate } from '@grootfolio/shared'
import type { AssetType, RiskProfileType } from '@grootfolio/shared'
import { usePortfolio, useQuizResult } from '@/lib/queries'
import { assetColor } from '@/lib/asset-visual'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'

const LABEL: Record<RiskProfileType, string> = { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' }
const ORDER: RiskProfileType[] = ['conservative', 'moderate', 'aggressive']
const CLASSES: Array<{ type: AssetType; label: string }> = [
  { type: 'crypto', label: 'Cripto' },
  { type: 'stock', label: 'Acciones' },
  { type: 'bond', label: 'Bonos' },
  { type: 'currency', label: 'Divisas y efectivo' },
]
const CARD = 'rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none'

export function ProfileResultPage() {
  const navigate = useNavigate()
  const { data: result, isLoading, isError, error, refetch } = useQuizResult()
  const { data: portfolio } = usePortfolio()

  if (isLoading) return <LoadingState label="Cargando tu perfil…" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil.'} onRetry={() => void refetch()} />
  if (!result) {
    return (
      <div className="mx-auto max-w-[680px]">
        <EmptyState
          title="Todavía no hiciste el test"
          description="Son unas pocas preguntas y te ayudan a leer tu cartera."
          action={
            <button onClick={() => navigate('/profile-test')} className="h-11 rounded-[10px] bg-brand-500 px-5 font-semibold text-white hover:bg-brand-600">
              Hacer el test
            </button>
          }
        />
      </div>
    )
  }

  const total = portfolio?.totalValue ?? 0
  const now = (t: AssetType) => {
    const v = portfolio?.distribution.find((d) => d.type === t)?.value ?? 0
    return total > 0 ? Math.round((v / total) * 100) : 0
  }
  const sug = ASIGNACION_SUGERIDA[result.profile]

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Perfil de inversor</h1>

      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[15px] text-ink-2">Tu perfil es</p>
          <span className="rounded-full bg-ink px-3.5 py-1 text-base font-bold text-surface">{LABEL[result.profile]}</span>
          <span className="text-xs text-ink-3">test del {formatDate(result.calculatedAt)}</span>
        </div>
        <div className="mt-4 flex gap-1.5" role="img" aria-label={`Perfil ${LABEL[result.profile]}, de conservador a agresivo`}>
          {ORDER.map((p) => (
            <div key={p} className="flex-1">
              <div className={`h-2 rounded-full ${p === result.profile ? 'bg-brand-500' : 'bg-muted'}`} />
              <p className={`mt-1.5 text-center text-[11.5px] ${p === result.profile ? 'font-semibold text-ink' : 'text-ink-3'}`}>{LABEL[p]}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{result.description}</p>
      </section>

      <section className={CARD}>
        <h2 className="mb-4 text-[15px] font-semibold">Tu cartera vs. la sugerida</h2>
        <div className="space-y-4">
          {CLASSES.map(({ type, label }) => {
            const c = assetColor(type)
            const hoy = now(type)
            return (
              <div key={type}>
                <div className="mb-1.5 flex items-baseline gap-2 text-[13.5px]">
                  <span className="flex-1">{label}</span>
                  <span className="font-bold tabular-nums">{hoy} %</span>
                  <span className="w-16 text-right text-xs tabular-nums text-ink-3">sug. {sug[type]} %</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${sug[type]}%`, background: c.accent }} />
                  <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ width: `${Math.min(100, hoy)}%`, background: c.accent }} />
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-[12.5px] text-ink-3">Es una referencia educativa, no una recomendación de compra o venta.</p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={() => navigate('/profile-test?rehacer=1')} className="h-12 flex-1 rounded-[11px] border border-ctl bg-surface font-semibold hover:bg-muted">
          Rehacer el test
        </button>
        <button onClick={() => navigate('/content')} className="h-12 flex-1 rounded-[11px] bg-brand-500 font-semibold text-white hover:bg-brand-600">
          Aprender sobre mi perfil
        </button>
      </div>
    </div>
  )
}
