/**
 * Lista de mensajes del asistente (rediseño, PR 2).
 *
 * El autoscroll respeta al usuario: sólo baja si ya estaba a menos de 80 px del
 * fondo, para no arrancarle la lectura de una respuesta larga cuando llega la
 * siguiente.
 *
 * Los mensajes van separados por día (spec §3): una conversación retomada al
 * otro día se lee como un bloque continuo si no se marca dónde cortó.
 */
import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import type { ChatMessage } from '@grootfolio/shared'
import { ErrorBubble, MessageBubble, UserBubble } from './MessageBubble'
import { MessageActions } from './MessageActions'
import { SourceChips } from './SourceChips'
import { TypingDots } from './TypingDots'

const AUTOSCROLL_THRESHOLD_PX = 80

/** Etiqueta del separador: "Hoy", "Ayer" o la fecha larga. */
function dayLabel(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-[color:var(--gf-line)]" />
      <span className="text-[10.5px] uppercase tracking-wide text-[color:var(--gf-ink-3)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[color:var(--gf-line)]" />
    </div>
  )
}

interface Props {
  messages: ChatMessage[]
  /** Reenvía la pregunta que originó una respuesta. */
  onRetryMessage?: (index: number) => void
  pending: string | null
  isStreaming: boolean
  error: string | null
  onRetry?: () => void
  empty: ReactNode
}

export function MessageList({
  messages,
  pending,
  isStreaming,
  error,
  onRetry,
  onRetryMessage,
  empty,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < AUTOSCROLL_THRESHOLD_PX
  }

  useEffect(() => {
    if (!stickToBottom.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, pending, isStreaming, error])

  const isEmpty = messages.length === 0 && !pending && !isStreaming && !error

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      aria-label="Conversación con el asistente"
    >
      {isEmpty && empty}

      {messages.map((message, index) => {
        const label = dayLabel(message.createdAt)
        const previous = messages[index - 1]
        // Se muestra en el primer mensaje y cada vez que cambia el día.
        const showSeparator =
          label !== null && (!previous || label !== dayLabel(previous.createdAt))

        return (
          <Fragment key={message.id}>
            {showSeparator && <DaySeparator label={label} />}
            <MessageBubble message={message}>
              <SourceChips message={message} />
              {message.role === 'assistant' && (
                <MessageActions
                  messageId={message.id}
                  content={message.content}
                  onRetry={onRetryMessage ? () => onRetryMessage(index) : undefined}
                />
              )}
            </MessageBubble>
          </Fragment>
        )
      })}

      {pending && <UserBubble content={pending} muted />}
      {isStreaming && <TypingDots />}
      {error && <ErrorBubble message={error} onRetry={onRetry} />}
    </div>
  )
}
