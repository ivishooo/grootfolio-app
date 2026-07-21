/**
 * ProfileResultPage — detalle del perfil (rediseño). Badge con ícono y color por
 * perfil, asignación sugerida con barras por clase de activo, y recomendaciones.
 * Conserva los hooks reales; la asignación se deriva del perfil (presentación).
 */
import { useNavigate } from 'react-router-dom'
import type { RiskProfileType } from '@grootfolio/shared'
import { useQuizResult } from '@/lib/queries'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'

const labels: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

const PROFILE_COLOR: Record<RiskProfileType, { accent: string; soft: string }> = {
  conservative: { accent: '#3B82F6', soft: 'rgba(59,130,246,0.14)' },
  moderate: { accent: '#F97316', soft: 'rgba(249,115,22,0.14)' },
  aggressive: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.14)' },
}

const ALLOCATION: Record<RiskProfileType, Array<{ label: string; pct: number }>> = {
  conservative: [
    { label: 'Renta fija', pct: 60 }, { label: 'Acciones', pct: 20 },
    { label: 'Criptomonedas', pct: 5 }, { label: 'Cash', pct: 15 },
  ],
  moderate: [
    { label: 'Renta fija', pct: 40 }, { label: 'Acciones', pct: 35 },
    { label: 'Criptomonedas', pct: 15 }, { label: 'Cash', pct: 10 },
  ],
  aggressive: [
    { label: 'Renta fija', pct: 15 }, { label: 'Acciones', pct: 50 },
    { label: 'Criptomonedas', pct: 30 }, { label: 'Cash', pct: 5 },
  ],
}

const ALLOC_COLORS: Record<string, string> = {
  'Renta fija': '#8B5CF6',
  Acciones: '#3B82F6',
  Criptomonedas: '#F97316',
  Cash: '#14B8A6',
}

function ProfileIcon({ profile }: { profile: RiskProfileType }) {
  const common = { width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (profile === 'conservative') {
    return <svg {...common}><path d="M12 3l7 3v5c0 4.5-3 7.2-7 8.5C8 18.2 5 15.5 5 11V6z" /><path d="M9 12l2 2 4-4.5" /></svg>
  }
  if (profile === 'moderate') {
    return <svg {...common}><path d="M12 4v16" /><path d="M5 8h14" /><path d="M5 8l-2.5 5a3 3 0 006 0z" /><path d="M19 8l-2.5 5a3 3 0 006 0z" /></svg>
  }
  return <svg {...common}><path d="M4 15l6-6 4 4 6-7" /><path d="M20 6h-4M20 6v4" /></svg>
}

export function ProfileResultPage() {
  const navigate = useNavigate()
  const { data: result, isLoading, isError, error, refetch } = useQuizResult()

  if (isLoading) return <LoadingState label="Cargando tu perfil…" />
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil.'}
        onRetry={() => void refetch()}
      />
    )
  }
  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Todavía no hiciste el test"
          description="Respondé el cuestionario para conocer tu perfil de inversor."
          action={
            <button onClick={() => navigate('/profile-test')} className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600">
              Hacer el test
            </button>
          }
        />
      </div>
    )
  }

  const pc = PROFILE_COLOR[result.profile]
  const allocation = ALLOCATION[result.profile]

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full" style={{ background: pc.soft, color: pc.accent }}>
          <ProfileIcon profile={result.profile} />
        </div>
        <p className="mt-4 text-sm text-neutral-500">Tu perfil de inversor es</p>
        <div className="mx-auto mt-2.5 inline-block rounded-full px-6 py-2 text-lg font-bold" style={{ background: pc.soft, color: pc.accent }}>
          {labels[result.profile]}
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{result.description}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-4 font-semibold">Asignación sugerida</h3>
        <div className="space-y-4">
          {allocation.map((a) => (
            <div key={a.label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ALLOC_COLORS[a.label] }} />
                  {a.label}
                </span>
                <span className="font-semibold tabular-nums">{a.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full transition-all" style={{ width: `${a.pct}%`, background: ALLOC_COLORS[a.label] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3.5 font-semibold">Recomendaciones para vos</h3>
        <div className="space-y-3">
          {result.recommendations.map((r) => (
            <div key={r} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[12px] font-bold" style={{ background: pc.soft, color: pc.accent }}>✓</span>
              <span className="text-[13.5px] leading-snug text-neutral-600 dark:text-neutral-300">{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/profile-test')} className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600">
          Hacer el test nuevamente
        </button>
        <button onClick={() => navigate('/dashboard')} className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          Ir al Dashboard
        </button>
      </div>
    </div>
  )
}
