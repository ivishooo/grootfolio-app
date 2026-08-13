/**
 * Estado del asistente (rediseño, PR 1). Único hook: el panel y sus piezas son
 * componentes tontos que reciben todo desde acá.
 *
 * En este PR sólo se centraliza el estado que ya existía y se agrega la apertura
 * (el panel arranca cerrado). El envío sigue usando el endpoint actual sin
 * cambios; el streaming SSE llega en el PR 4.
 */
import { useCallback, useState } from 'react'
import type { ChatMessage } from '@grootfolio/shared'
import { useChatMessages, useSendChatMessage } from '@/lib/queries'

export type AssistantStatus = 'idle' | 'streaming' | 'error'

export interface AssistantChat {
  isOpen: boolean
  isExpanded: boolean
  messages: ChatMessage[]
  /** Pregunta enviada todavía sin respuesta, para pintarla al instante. */
  pending: string | null
  status: AssistantStatus
  error: string | null
  open: () => void
  close: () => void
  toggleExpanded: () => void
  newConversation: () => void
  send: (text: string) => Promise<void>
}

export function useAssistantChat(): AssistantChat {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // El historial sólo se pide con el panel abierto: cerrado no hay nada que pintar.
  const { data: messages = [] } = useChatMessages(isOpen ? conversationId : null)
  const sendMessage = useSendChatMessage()

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || sendMessage.isPending) return
      setError(null)
      setPending(message)
      try {
        const answer = await sendMessage.mutateAsync({
          message,
          ...(conversationId ? { conversationId } : {}),
        })
        setConversationId(answer.conversationId)
      } catch (err) {
        const code = (err as { code?: string })?.code
        setError(
          code === 'CHAT_RATE_LIMITED'
            ? 'Llegaste al límite de consultas por hora. Probá de nuevo más tarde.'
            : code === 'AI_UNAVAILABLE'
              ? 'El asistente no está disponible en este entorno.'
              : 'No pude responder ahora mismo.'
        )
        throw err
      } finally {
        setPending(null)
      }
    },
    [conversationId, sendMessage]
  )

  const newConversation = useCallback(() => {
    setConversationId(null)
    setError(null)
  }, [])

  return {
    isOpen,
    isExpanded,
    messages,
    pending,
    status: sendMessage.isPending ? 'streaming' : error ? 'error' : 'idle',
    error,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => {
      setIsOpen(false)
      setIsExpanded(false)
    }, []),
    toggleExpanded: useCallback(() => setIsExpanded((v) => !v), []),
    newConversation,
    send,
  }
}
