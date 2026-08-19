/**
 * Composer del asistente (rediseño, PR 2).
 *
 * Lo que resuelve del diagnóstico (04 Affordance):
 *  - **Autogrow** hasta 5 líneas y después scroll interno, en vez de un input de
 *    una línea donde no se ve lo que escribís.
 *  - **Enter envía, Shift+Enter salta de línea**, con el hint a la vista: antes
 *    no había forma de saberlo.
 *  - Botón con dos estados reales: deshabilitado (gris, se lee como
 *    deshabilitado) y activo (naranja).
 *
 * No hay botón de "detener" ni chips de seguimiento: los dos dependían del
 * streaming SSE que el rediseño descartó (ver la nota de desviaciones en
 * docs/SPEC_ASISTENTE_CHAT.md §7). Estaban implementados pero ningún llamador
 * les pasaba las props, así que eran código muerto que aparentaba una función
 * que el asistente no tiene.
 */
import { useEffect, useRef, useState } from 'react'

const MAX_ROWS = 5
const LINE_HEIGHT_PX = 20
const PADDING_Y_PX = 20

interface Props {
  onSend: (text: string) => void
  isStreaming: boolean
}

export function Composer({ onSend, isStreaming }: Props) {
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

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          title="Enviar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--gf-accent-strong)] text-white transition-colors hover:bg-[color:var(--gf-accent-strong-hover)] disabled:cursor-not-allowed disabled:bg-[color:var(--gf-line)] disabled:text-[color:var(--gf-ink-3)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>

      {/*
        El disclaimer es fijo, no sólo de la bienvenida (spec §3): la duda sobre
        qué puede responder el bot aparece cuando ya está respondiendo, no antes
        de la primera pregunta.
      */}
      <p className="mt-1.5 px-1 text-[10.5px] leading-4 text-[color:var(--gf-ink-3)]">
        Enter para enviar · Shift + Enter salto de línea
        <br />
        Respondo sobre GrootFolio y lo que el equipo documentó. No es
        asesoramiento financiero.
      </p>
    </footer>
  )
}
