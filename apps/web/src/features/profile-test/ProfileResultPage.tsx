/**
 * ProfileResultPage - resultado del cuestionario.
 * Implementar segun Figma "04b - Profile Result - Desktop". Ver CLAUDE_CODE_PLAN.md Fase 3.
 */
import { mockProfileResult } from '@/mocks/portfolio'
import { useNavigate } from 'react-router-dom'

const labels = { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' } as const

export function ProfileResultPage() {
  const result = mockProfileResult
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto h-20 w-20 rounded-full bg-brand-100 dark:bg-brand-500/10 grid place-items-center">
          <span className="text-3xl text-brand-500">🛡</span>
        </div>
        <h2 className="mt-4 text-xl font-bold">Tu perfil de inversor es...</h2>
        <div className="mt-3 rounded-full bg-brand-100 dark:bg-brand-500/10 py-2 text-brand-500 font-semibold">
          {labels[result.profile]}
        </div>
        <p className="mt-3 text-sm text-neutral-500">{result.description}</p>
        <div className="mt-6 rounded-xl bg-neutral-200/60 dark:bg-neutral-700/40 p-4 text-left">
          <div className="font-semibold">Recomendaciones para ti:</div>
          <ul className="mt-2 text-sm space-y-1 text-neutral-600 dark:text-neutral-300">
            {result.recommendations.map((r) => (<li key={r}>- {r}</li>))}
          </ul>
        </div>
        <button onClick={() => navigate('/profile-test')} className="mt-6 w-full rounded-lg bg-brand-500 py-2 font-medium text-white hover:bg-brand-600">
          Hacer el test nuevamente
        </button>
      </div>
    </div>
  )
}
