import { mockProfileResult } from '@/mocks/portfolio'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import { themes } from '@grootfolio/tokens'

const labels = { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' } as const

const allocation = [
  { label: 'Renta fija', pct: 40 },
  { label: 'Acciones', pct: 35 },
  { label: 'Criptomonedas', pct: 15 },
  { label: 'Cash', pct: 10 },
]

export function ProfileResultPage() {
  const result = mockProfileResult
  const navigate = useNavigate()
  const { theme: themeName } = useTheme()
  const chartColors = [
    themes[themeName].chart.series1,
    themes[themeName].chart.series2,
    themes[themeName].chart.series3,
    themes[themeName].chart.series4,
  ]

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
        <p className="mt-3 text-sm text-neutral-500">{result.description}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="font-semibold mb-4">Asignacion sugerida</h3>
        <div className="space-y-3">
          {allocation.map((a, i) => (
            <div key={a.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{a.label}</span>
                <span className="font-medium">{a.pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${a.pct}%`, backgroundColor: chartColors[i] }}
                />
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
