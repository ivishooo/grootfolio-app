/**
 * Bienvenida y sugerencias (rediseño, PR 3).
 *
 * Resuelve el problema 03 del diagnóstico: antes había ~600 px de aire muerto,
 * el saludo era un párrafo suelto y las sugerencias flotaban sin agrupar. Ahora
 * hay saludo con nombre, aclaración de alcance, un label que agrupa y tarjetas
 * que dicen **qué va a pasar** si las tocás, no sólo la pregunta.
 *
 * Nota de alcance: el spec propone además "puedo leer tus activos" y un bloque
 * con datos del portafolio. Eso contradice el ADR-0004, donde el asistente tiene
 * explícitamente prohibido hablar de la cartera del usuario, así que el texto se
 * mantiene en lo que el bot realmente puede hacer hoy. Cambiarlo es una decisión
 * de producto, no de interfaz.
 */
import { useAuth } from '@/auth/AuthProvider'

export interface Suggestion {
  question: string
  hint: string
  icon: 'doc' | 'chart' | 'shield'
}

export const SUGGESTIONS: Suggestion[] = [
  { question: '¿Cómo cargo una transacción?', hint: 'Guía paso a paso · 30 s', icon: 'doc' },
  { question: '¿Qué es el P&L no realizado?', hint: 'Concepto explicado con ejemplo', icon: 'chart' },
  { question: '¿Para qué sirve diversificar?', hint: 'Cómo se reparte el riesgo', icon: 'shield' },
]

function SuggestionIcon({ kind }: { kind: Suggestion['icon'] }) {
  const paths: Record<Suggestion['icon'], string> = {
    doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
    chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--gf-accent-soft)] text-[color:var(--gf-accent)]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d={paths[kind]} />
      </svg>
    </span>
  )
}

export function SuggestionCards({ onPick }: { onPick: (question: string) => void }) {
  const { user } = useAuth()
  const firstName = user?.fullName?.trim().split(' ')[0]

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-[color:var(--gf-ink)]">
          {firstName ? `Hola ${firstName}` : 'Hola'}
        </h3>
        <p className="text-sm leading-relaxed text-[color:var(--gf-ink-2)]">
          Puedo ayudarte con el uso de GrootFolio y con los temas de inversión que documentamos.
          Si algo no está documentado, te lo digo — no lo invento.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10.5px] font-medium uppercase tracking-wide text-[color:var(--gf-ink-3)]">
          Empezá por acá
        </p>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.question}
            type="button"
            onClick={() => onPick(suggestion.question)}
            className="flex w-full items-center gap-3 rounded-[12px] border border-[color:var(--gf-border)] bg-[color:var(--gf-surface)] px-3 py-2.5 text-left transition-colors hover:border-[color:var(--gf-accent)]"
          >
            <SuggestionIcon kind={suggestion.icon} />
            <span className="min-w-0">
              <strong className="block truncate text-sm font-medium text-[color:var(--gf-ink)]">
                {suggestion.question}
              </strong>
              <small className="block truncate text-xs text-[color:var(--gf-ink-3)]">
                {suggestion.hint}
              </small>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
