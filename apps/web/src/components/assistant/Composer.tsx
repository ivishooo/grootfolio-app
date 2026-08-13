/**
 * Composer del asistente (rediseño, PR 2).
 *
 * Lo que resuelve del diagnóstico (04 Affordance):
 *  - **Autogrow** hasta 5 líneas y después scroll interno, en vez de un input de
 *    una línea donde no se ve lo que escribís.
 *  - **Enter envía, Shift+Enter salta de línea**, con el hint a la vista: antes
 *    no había forma de saberlo.
 *  - Botón con tres estados reales: deshabilitado (gris, se lee como
 *    deshabilitado), activo (naranja) y enviando (detener).
 */
import { useEffect, useRef, useState } from 'react'

const MAX_ROWS = 5
const LINE_HEIGHT_PX = 20
const PADDING_Y_PX = 20

interface Props {
  onSend: (text: string) => void
  onStop?: () => void
  isStreaming: boolean
  /** Sugerencias de seguimiento, encima del input. */
  followUps?: string[]
  onFollowUp?: (text: string) => void
}

export function Composer({ onSend, onStop, isStreaming, followUps = [], onFollowUp }: Props) {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = !!draft.trim() && !isStreaming

  // Autogrow: se recalcula a cada cambio, con tope de MAX_ROWS.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const max = MAX_ROWS * LINE_HEIGHT_PX + PADDING_Y_PX
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [draft])

  const submit = () => {
    if (!canSend) return
    onSend(draft)
    setDraft('')
  }

  return (
    <footer className="border-t border-[color:var(--gf-line)] px-3 pb-3 pt-2">
      {followUps.length > 0 && !isStreaming && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {followUps.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onFollowUp?.(text)}
              className="rounded-full border border-[color:var(--gf-border)] bg-[color:var(--gf-accent-soft)] px-3 py-1 text-xs text-[color:var(--gf-ink-2)] transition-colors hover:border-[color:var(--gf-accent)] hover:text-[color:var(--gf-accent)]"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 rounded-[var(--gf-r-composer)] border border-[color:var(--gf-border)] bg-[color:var(--gf-surface)] p-1.5 focus-within:ring-2 focus-within:ring-brand-500/25"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía; Shift+Enter deja el salto de línea al textarea.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Preguntá sobre GrootFolio…"
          aria-label="Mensaje para el asistente"
          maxLength={1000}
          className="max-h-[120px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-[color:var(--gf-ink)] placeholder:text-[color:var(--gf-ink-3)] focus:outline-none"
        />

        {isStreaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Detener la respuesta"
            title="Detener"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[color:var(--gf-border)] text-[color:var(--gf-ink-2)] transition-colors hover:bg-[color:var(--gf-line)]"
          >
            <span className="block h-2.5 w-2.5 rounded-[2px] bg-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Enviar mensaje"
            title="Enviar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--gf-accent)] text-white transition-colors hover:bg-[color:var(--gf-accent-hover)] disabled:cursor-not-allowed disabled:bg-[color:var(--gf-line)] disabled:text-[color:var(--gf-ink-3)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </form>

      <p className="mt-1.5 px-1 text-[10.5px] text-[color:var(--gf-ink-3)]">
        Enter para enviar · Shift + Enter salto de línea
      </p>
    </footer>
  )
}
