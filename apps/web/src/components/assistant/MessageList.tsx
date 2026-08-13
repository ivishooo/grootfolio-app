/**
 * Lista de mensajes del asistente (rediseño, PR 1).
 *
 * En este PR se porta el contenido tal cual estaba, dentro del shell nuevo: las
 * burbujas, las fuentes y las acciones se rediseñan en los PR 2 y 4. Lo único
 * que cambia acá es el **autoscroll**, que ahora respeta al usuario: sólo baja
 * si ya estaba al fondo (< 80 px), para no arrancarle la lectura de una
 * respuesta larga cuando llega la siguiente.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ChatMessage } from '@grootfolio/shared'
import { Markdown } from '@/components/ui/Markdown'

const AUTOSCROLL_THRESHOLD_PX = 80

function Sources({ message }: { message: ChatMessage }) {
  if (!message.grounded || message.sources.length === 0) return null
  return (
    <div className="mt-2 border-t border-[color:var(--gf-line)] pt-2">
      <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-[color:var(--gf-ink-3)]">
        Fuentes
      </p>
      <ul className="space-y-0.5">
        {message.sources.map((source) => (
          <li key={`${source.articleId}-${source.heading ?? ''}`} className="text-xs">
            <Link to={`/content?kb=${source.slug}`} className="text-[color:var(--gf-accent)] hover:underline">
              {source.title}
              {source.heading ? ` › ${source.heading}` : ''}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          mine
            ? 'max-w-[85%] rounded-[var(--gf-r-bubble)] bg-[color:var(--gf-accent)] px-3 py-2 text-sm text-white'
            : 'max-w-[85%] rounded-[var(--gf-r-bubble)] border border-[color:var(--gf-bubble-bot-border)] bg-[color:var(--gf-bubble-bot)] px-3 py-2 text-sm text-[color:var(--gf-ink)]'
        }
      >
        {mine ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <Markdown source={message.content} />
            <Sources message={message} />
          </>
        )}
      </div>
    </div>
  )
}

interface Props {
  messages: ChatMessage[]
  pending: string | null
  isStreaming: boolean
  error: string | null
  /** Estado vacío: lo arma el contenedor (se rediseña en el PR 3). */
  empty: ReactNode
}

export function MessageList({ messages, pending, isStreaming, error, empty }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // Antes de cada repintado se recuerda si el usuario estaba al fondo.
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < AUTOSCROLL_THRESHOLD_PX
  }

  useEffect(() => {
    if (!stickToBottom.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, pending, isStreaming])

  const isEmpty = messages.length === 0 && !pending && !isStreaming

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      role="log"
      aria-live="polite"
      aria-label="Conversación con el asistente"
    >
      {isEmpty && empty}

      {messages.map((message) => (
        <Bubble key={message.id} message={message} />
      ))}

      {pending && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-[var(--gf-r-bubble)] bg-[color:var(--gf-accent)] px-3 py-2 text-sm text-white opacity-70">
            <p className="whitespace-pre-wrap">{pending}</p>
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="rounded-[var(--gf-r-bubble)] border border-[color:var(--gf-bubble-bot-border)] bg-[color:var(--gf-bubble-bot)] px-3 py-2 text-sm text-[color:var(--gf-ink-3)]">
            Pensando…
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-[#DC2626] dark:bg-red-500/10">
          {error}
        </p>
      )}
    </div>
  )
}
