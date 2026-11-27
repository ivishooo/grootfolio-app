/**
 * Perfil de inversor · test (rediseño v2, Fase 5). SPEC-pantallas › Perfil.
 * Progreso «Pregunta N de M» con %, opciones de 52 px con radio y
 * «← Anterior» / «Siguiente →» / «Ver mi perfil». Si ya hay perfil, la página
 * muestra el resultado; `?rehacer=1` arranca el test de nuevo.
 */
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useGroot } from '@/components/groot/GrootProvider'
import { useQuiz, useQuizResult, useSubmitQuiz } from '@/lib/queries'
import { ErrorState, LoadingState } from '@/components/ui/States'

export function ProfileTestPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const groot = useGroot()
  const result = useQuizResult()
  const { data: questions, isLoading, isError, error, refetch } = useQuiz()
  const submitQuiz = useSubmitQuiz()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const retake = params.get('rehacer') === '1'

  if (isLoading || result.isLoading) return <LoadingState label="Cargando el test…" />
  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : 'No se pudo cargar el test.'} onRetry={() => void refetch()} />
  }
  if (result.data && !retake) return <Navigate to="/profile-test/result" replace />
  if (!questions || questions.length === 0) return null

  const question = questions[step]!
  const progress = Math.round(((step + 1) / questions.length) * 100)
  const isLast = step + 1 >= questions.length
  const answered = Boolean(selected[question.id])

  const handleNext = () => {
    if (!answered) return
    if (!isLast) {
      setStep(step + 1)
      return
    }
    const answers = questions.map((q) => ({ questionId: q.id, optionId: selected[q.id]! }))
    submitQuiz.mutate(answers, {
      onSuccess: () => {
        groot.decir('perfil')
        navigate('/profile-test/result')
      },
    })
  }

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Perfil de inversor</h1>

      <div>
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="text-ink-2">
            Pregunta {step + 1} de {questions.length}
          </span>
          <span className="font-semibold text-brand-ink">{progress} %</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <fieldset className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none">
        <legend className="sr-only">{question.text}</legend>
        <p className="text-[17px] font-semibold" aria-hidden="true">{question.text}</p>
        <div className="mt-4 space-y-2.5" role="radiogroup" aria-label={question.text}>
          {question.options.map((o) => {
            const on = selected[question.id] === o.id
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid="quiz-option"
                onClick={() => setSelected((p) => ({ ...p, [question.id]: o.id }))}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left text-sm transition-colors ${
                  on ? 'border-brand-500 bg-brand-tint' : 'border-line hover:border-ctl'
                }`}
              >
                <span
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] text-xs text-white ${on ? 'border-brand-500 bg-brand-500' : 'border-ctl'}`}
                  aria-hidden="true"
                >
                  {on ? '✓' : ''}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {submitQuiz.isError && (
        <p className="text-sm font-medium text-neg" role="alert">
          {submitQuiz.error instanceof Error ? submitQuiz.error.message : 'No se pudo guardar el test.'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || submitQuiz.isPending}
          className="h-12 rounded-[11px] border border-ctl bg-surface px-5 font-semibold disabled:opacity-45"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-disabled={!answered}
          disabled={submitQuiz.isPending}
          className={`h-12 flex-1 rounded-[11px] bg-brand-500 font-semibold text-white hover:bg-brand-600 ${answered ? '' : 'opacity-45'}`}
        >
          {isLast ? (submitQuiz.isPending ? 'Calculando…' : 'Ver mi perfil') : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
