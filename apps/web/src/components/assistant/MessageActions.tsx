/**
 * Acciones sobre una respuesta del asistente (rediseño, PR 4): copiar,
 * reintentar y votar si sirvió.
 *
 * Cierra el problema 05 del diagnóstico: el bot prometía no inventar, pero no
 * había forma de medir si la respuesta servía. El voto se persiste junto al
 * `retrieval_score` del mensaje, así en F7 se puede cruzar "score alto" con "al
 * usuario no le sirvió", que es la señal más útil para calibrar.
 *
 * Las acciones sólo aparecen al pasar el mouse o al enfocarlas con el teclado:
 * no compiten con el texto de la respuesta.
 */
import { useState } from 'react'
import { useChatFeedback } from '@/lib/queries'

interface Props {
  messageId: string
  content: string
  onRetry?: () => void
}

function ActionButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        active
          ? 'bg-[color:var(--gf-accent-soft)] text-[color:var(--gf-accent)]'
          : 'text-[color:var(--gf-ink-3)] hover:bg-[color:var(--gf-line)] hover:text-[color:var(--gf-ink-2)]'
      }`}
    >
      {children}
    </button>
  )
}

export function MessageActions({ messageId, content, onRetry }: Props) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<1 | -1 | null>(null)
  const feedback = useChatFeedback()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer; no se rompe el chat.
    }
  }

  const sendVote = (value: 1 | -1) => {
    // Votar lo mismo dos veces lo desmarca; el backend guarda el último voto.
    const next = vote === value ? null : value
    setVote(next)
    if (next !== null) feedback.mutate({ messageId, vote: next })
  }

  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <ActionButton label={copied ? 'Copiado' : 'Copiar respuesta'} onClick={() => void copy()}>
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </ActionButton>

      {onRetry && (
        <ActionButton label="Volver a preguntar" onClick={onRetry}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </ActionButton>
      )}

      <ActionButton label="Respuesta útil" onClick={() => sendVote(1)} active={vote === 1}>
        <svg viewBox="0 0 24 24" fill={vote === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM7 10l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.4l-1.4 6A2 2 0 0 1 16.6 21H7" />
        </svg>
      </ActionButton>

      <ActionButton label="Respuesta no útil" onClick={() => sendVote(-1)} active={vote === -1}>
        <svg viewBox="0 0 24 24" fill={vote === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1zM17 14l-4 7a2 2 0 0 1-3-2l1-5H6a2 2 0 0 1-2-2.4l1.4-6A2 2 0 0 1 7.4 3H17" />
        </svg>
      </ActionButton>

      {vote !== null && (
        <span className="ml-1 text-[10.5px] text-[color:var(--gf-ink-3)]">Gracias</span>
      )}
    </div>
  )
}
