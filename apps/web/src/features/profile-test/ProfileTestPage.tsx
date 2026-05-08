/**
 * ProfileTestPage - cuestionario de perfil de inversor.
 * Implementar segun Figma "04 - Profile Test - Desktop". Ver CLAUDE_CODE_PLAN.md Fase 3.
 */
import { useState } from 'react'
import { mockQuiz } from '@/mocks/portfolio'
import { useNavigate } from 'react-router-dom'

export function ProfileTestPage() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const navigate = useNavigate()
  const question = mockQuiz[step]!
  const progress = ((step + 1) / mockQuiz.length) * 100

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Test de Perfil</h2>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">Pregunta {step + 1} de {mockQuiz.length}</span>
        <span className="text-brand-500">{Math.round(progress)}% Completado</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold">{question.text}</h3>
        <div className="mt-4 space-y-3">
          {question.options.map((o) => {
            const isSelected = selected[question.id] === o.id
            return (
              <button
                key={o.id}
                onClick={() => setSelected({ ...selected, [question.id]: o.id })}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${isSelected ? 'border-brand-500 bg-brand-100 dark:bg-brand-500/10' : 'border-neutral-200 dark:border-neutral-800'}`}
              >
                <span className={`h-6 w-6 rounded-full ${isSelected ? 'bg-brand-500 text-white grid place-items-center' : 'border border-neutral-300 dark:border-neutral-600'}`}>
                  {isSelected ? '✓' : ''}
                </span>
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="rounded-lg border border-neutral-300 px-6 py-2 disabled:opacity-50 dark:border-neutral-700"
        >
          ← Anterior
        </button>
        <button
          disabled={!selected[question.id]}
          onClick={() => (step + 1 < mockQuiz.length ? setStep(step + 1) : navigate('/profile-test/result'))}
          className="flex-1 rounded-lg bg-brand-500 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step + 1 < mockQuiz.length ? 'Siguiente →' : 'Finalizar'}
        </button>
      </div>
    </div>
  )
}
