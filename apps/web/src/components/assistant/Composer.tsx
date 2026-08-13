/**
 * Composer del asistente (rediseño, PR 1). Se porta el input actual al shell
 * nuevo; el autogrow, Enter/Shift+Enter y los estados del botón se rediseñan en
 * el PR 2.
 */
import { useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export function Composer({ onSend, disabled }: Props) {
  const [draft, setDraft] = useState('')
  const canSend = !!draft.trim() && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(draft)
    setDraft('')
  }

  return (
    <footer className="border-t border-[color:var(--gf-line)] p-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Preguntá sobre GrootFolio…"
          aria-label="Mensaje para el asistente"
          maxLength={1000}
          className="h-10 flex-1 rounded-[var(--gf-r-composer)] border border-[color:var(--gf-border)] bg-transparent px-3 text-sm text-[color:var(--gf-ink)] placeholder:text-[color:var(--gf-ink-3)] focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar"
          className="rounded-[var(--gf-r-composer)] bg-[color:var(--gf-accent)] px-4 text-sm font-medium text-white transition-colors hover:bg-[color:var(--gf-accent-hover)] disabled:cursor-not-allowed disabled:bg-[color:var(--gf-line)] disabled:text-[color:var(--gf-ink-3)]"
        >
          Enviar
        </button>
      </form>
    </footer>
  )
}
