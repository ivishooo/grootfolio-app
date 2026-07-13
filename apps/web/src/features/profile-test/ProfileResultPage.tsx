import { useNavigate } from 'react-router-dom'
import type { RiskProfileType } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import { themes } from '@grootfolio/tokens'
import { useQuizResult } from '@/lib/queries'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'

const labels: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

// Asignacion sugerida por perfil (presentacion: se deriva del perfil, el backend
// devuelve perfil/score/descripcion/recomendaciones, no la distribucion).
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

export function ProfileResultPage() {
  const navigate = useNavigate()
  const { theme: themeName } = useTheme()
  const { data: result, isLoading, isError, error, refetch } = useQuizResult()
  const chartColors = [
    themes[themeName].chart.series1,
    themes[themeName].chart.series2,
    themes[themeName].chart.series3,
    themes[themeName].chart.series4,
  ]

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
            <button onClick={() => navigate('/profile-test')} className="rounded-lg bg-brand-500 px-5 py-2 font-medium text-white hover:bg-brand-600">
              Hacer el test
            </button>
          }
        />
      </div>
    )
  }

  const allocation = ALLOCATION[result.profile]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto h-20 w-20 rounded-full bg-brand-100 dark:bg-brand-500/10 grid place-items-center">
          <span className="text-3xl text-brand-500">🛡</span>
        </div>
        <h2 className="mt-4 text-xl font-bold">Tu perfil de inversor es...</h2>
        <div className="mt-3 rounded-full bg-brand-100 dark:bg-brand-500/10 py-2 text-brand-500 font-semibold">
          {labels[result.profile]}
        </div>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{result.description}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="font-semibold mb-4">Asignación sugerida</h3>
        <div className="space-y-3">
          {allocation.map((a, i) => (
            <div key={a.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{a.label}</span>
                <span className="font-medium">{a.pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full transition-all" style={{ width: `${a.pct}%`, backgroundColor: chartColors[i] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="font-semibold mb-2">Recomendaciones para ti</h3>
        <ul className="text-sm space-y-1 text-neutral-600 dark:text-neutral-300">
          {result.recommendations.map((r) => (<li key={r}>- {r}</li>))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/profile-test')} className="flex-1 rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600">
          Hacer el test nuevamente
        </button>
        <button onClick={() => navigate('/dashboard')} className="flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
          Ir al Dashboard
        </button>
      </div>
    </div>
  )
}
