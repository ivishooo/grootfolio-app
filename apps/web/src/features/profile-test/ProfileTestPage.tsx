/**
 * ProfileTestPage - cuestionario de perfil de inversor (datos reales).
 * Si el usuario ya tiene un perfil, muestra un resumen con la opcion de rehacer
 * el test en vez de mostrar el formulario directo.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RiskProfileType } from '@grootfolio/shared'
import { useQuiz, useQuizResult, useSubmitQuiz } from '@/lib/queries'
import { ErrorState, LoadingState } from '@/components/ui/States'

const labels: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

export function ProfileTestPage() {
  const navigate = useNavigate()
  const result = useQuizResult()
  const { data: questions, isLoading, isError, error, refetch } = useQuiz()
  const submitQuiz = useSubmitQuiz()
  const [retake, setRetake] = useState(false)
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})

  if (isLoading || result.isLoading) return <LoadingState label="Cargando el cuestionario…" />
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'No se pudo cargar el cuestionario.'}
        onRetry={() => void refetch()}
      />
    )
  }

  // Ya tiene perfil y no eligio rehacer: mostramos el perfil actual.
  if (result.data && !retake) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold">Test de Perfil</h2>
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Tu perfil de inversor es</p>
          <div className="mx-auto mt-3 inline-block rounded-full bg-brand-100 px-6 py-2 text-lg font-semibold text-brand-500 dark:bg-brand-500/10">
            {labels[result.data.profile]}
          </div>
          <p className="mt-4 text-sm text-neutral-500">{result.data.description}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/profile-test/result')}
            className="flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Ver detalle
          </button>
          <button
            onClick={() => { setRetake(true); setStep(0); setSelected({}) }}
            className="flex-1 rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600"
          >
            Volver a hacer el test
          </button>
        </div>
      </div>
    )
  }

  if (!questions || questions.length === 0) return null

  const question = questions[step]!
  const progress = ((step + 1) / questions.length) * 100
  const isLast = step + 1 >= questions.length

  const handleNext = () => {
    if (!isLast) {
      setStep(step + 1)
      return
    }
    const answers = questions.map((q) => ({ questionId: q.id, optionId: selected[q.id]! }))
    submitQuiz.mutate(answers, {
      onSuccess: () => navigate('/profile-test/result'),
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Test de Perfil</h2>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">Pregunta {step + 1} de {questions.length}</span>
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
      {submitQuiz.isError && (
        <p className="text-danger-500 text-sm font-medium">
          {submitQuiz.error instanceof Error ? submitQuiz.error.message : 'No se pudo calcular tu perfil.'}
        </p>
      )}
      <div className="flex gap-3">
        <button
          disabled={step === 0 || submitQuiz.isPending}
          onClick={() => setStep(step - 1)}
          className="rounded-lg border border-neutral-300 px-6 py-2 disabled:opacity-50 dark:border-neutral-700"
        >
          ← Anterior
        </button>
        <button
          disabled={!selected[question.id] || submitQuiz.isPending}
          onClick={handleNext}
          className="flex-1 rounded-lg bg-brand-500 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLast ? (submitQuiz.isPending ? 'Calculando…' : 'Finalizar') : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
