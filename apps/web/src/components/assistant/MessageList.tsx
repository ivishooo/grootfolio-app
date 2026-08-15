/**
 * Lista de mensajes del asistente (rediseño, PR 2).
 *
 * El autoscroll respeta al usuario: sólo baja si ya estaba a menos de 80 px del
 * fondo, para no arrancarle la lectura de una respuesta larga cuando llega la
 * siguiente.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import type { ChatMessage } from '@grootfolio/shared'
import { ErrorBubble, MessageBubble, UserBubble } from './MessageBubble'
import { MessageActions } from './MessageActions'
import { SourceChips } from './SourceChips'
import { TypingDots } from './TypingDots'

const AUTOSCROLL_THRESHOLD_PX = 80

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

      {messages.map((message, index) => (
        <MessageBubble key={message.id} message={message}>
          <SourceChips message={message} />
          {message.role === 'assistant' && (
            <MessageActions
              messageId={message.id}
              content={message.content}
              onRetry={onRetryMessage ? () => onRetryMessage(index) : undefined}
            />
          )}
        </MessageBubble>
      ))}

      {pending && <UserBubble content={pending} muted />}
      {isStreaming && <TypingDots />}
      {error && <ErrorBubble message={error} onRetry={onRetry} />}
    </div>
  )
}
