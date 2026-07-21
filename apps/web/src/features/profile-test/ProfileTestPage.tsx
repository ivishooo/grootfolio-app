/**
 * ProfileTestPage — cuestionario de perfil de inversor (rediseño). Barra de
 * progreso, opciones tipo radio con acento y navegación. Si ya hay perfil,
 * muestra un resumen con opción de rehacer. Conserva los hooks reales.
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

const PROFILE_COLOR: Record<RiskProfileType, { accent: string; soft: string }> = {
  conservative: { accent: '#3B82F6', soft: 'rgba(59,130,246,0.14)' },
  moderate: { accent: '#F97316', soft: 'rgba(249,115,22,0.14)' },
  aggressive: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.14)' },
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

  if (result.data && !retake) {
    const pc = PROFILE_COLOR[result.data.profile]
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <h2 className="text-2xl font-bold">Test de Perfil</h2>
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Tu perfil de inversor es</p>
          <div className="mx-auto mt-3 inline-block rounded-full px-6 py-2 text-lg font-bold" style={{ background: pc.soft, color: pc.accent }}>
            {labels[result.data.profile]}
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{result.data.description}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/profile-test/result')}
            className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Ver detalle
          </button>
          <button
            onClick={() => { setRetake(true); setStep(0); setSelected({}) }}
            className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600"
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Test de Perfil</h2>
        <p className="mt-1 text-sm text-neutral-500">Descubrí tu perfil de inversor y una asignación sugerida.</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-neutral-500">Pregunta {step + 1} de {questions.length}</span>
          <span className="font-semibold text-brand-500">{Math.round(progress)}% completado</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold leading-snug">{question.text}</h3>
        <div className="mt-4 space-y-2.5" role="radiogroup" aria-label={question.text}>
          {question.options.map((o) => {
            const isSelected = selected[question.id] === o.id
            return (
              <button
                key={o.id}
                data-testid="quiz-option"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected({ ...selected, [question.id]: o.id })}
                className="flex w-full items-center gap-3 rounded-xl border-[1.5px] border-neutral-200 p-[15px] text-left text-sm transition-colors dark:border-neutral-800"
                style={isSelected
                  ? { borderColor: '#F97316', background: 'rgba(249,115,22,0.08)' }
                  : undefined}
              >
                <span
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                    isSelected ? 'bg-brand-500 text-white' : 'border-[1.5px] border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {isSelected ? '✓' : ''}
                </span>
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {submitQuiz.isError && (
        <p className="text-sm font-medium text-danger-500">
          {submitQuiz.error instanceof Error ? submitQuiz.error.message : 'No se pudo calcular tu perfil.'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          disabled={step === 0 || submitQuiz.isPending}
          onClick={() => setStep(step - 1)}
          className="rounded-xl border border-neutral-300 px-6 py-3 font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          ← Anterior
        </button>
        <button
          disabled={!selected[question.id] || submitQuiz.isPending}
          onClick={handleNext}
          className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? (submitQuiz.isPending ? 'Calculando…' : 'Finalizar') : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
