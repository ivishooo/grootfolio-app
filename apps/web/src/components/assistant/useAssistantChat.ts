/**
 * Estado del asistente (rediseño, PR 1). Único hook: el panel y sus piezas son
 * componentes tontos que reciben todo desde acá.
 *
 * En este PR sólo se centraliza el estado que ya existía y se agrega la apertura
 * (el panel arranca cerrado). El envío sigue usando el endpoint actual sin
 * cambios; el streaming SSE llega en el PR 4.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ChatMessage } from '@grootfolio/shared'
import { useChatMessages, useSendChatMessage } from '@/lib/queries'
import { useAuth } from '@/auth/AuthProvider'

/**
 * Se persiste **por usuario**: la conversación abierta de una cuenta no debe
 * aparecer al iniciar sesión con otra en el mismo navegador. Se guarda sólo el
 * id de la conversación y si el panel estaba abierto — los mensajes vienen del
 * servidor, que es la fuente de verdad.
 */
const storageKey = (userId: string) => `gf_assistant_${userId}`

interface PersistedState {
  isOpen: boolean
  conversationId: string | null
}

function readPersisted(userId: string | undefined): PersistedState {
  if (!userId) return { isOpen: false, conversationId: null }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { isOpen: false, conversationId: null }
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      isOpen: parsed.isOpen === true,
      conversationId: typeof parsed.conversationId === 'string' ? parsed.conversationId : null,
    }
  } catch {
    return { isOpen: false, conversationId: null }
  }
}

export type AssistantStatus = 'idle' | 'streaming' | 'error'

export interface AssistantChat {
  isOpen: boolean
  isExpanded: boolean
  conversationId: string | null
  messages: ChatMessage[]
  /** Pregunta enviada todavía sin respuesta, para pintarla al instante. */
  pending: string | null
  status: AssistantStatus
  error: string | null
  /** Última pregunta enviada, para poder reintentarla si falló. */
  lastQuestion: string | null
  open: () => void
  close: () => void
  toggleExpanded: () => void
  newConversation: () => void
  openConversation: (id: string) => void
  send: (text: string) => Promise<void>
}

export function useAssistantChat(): AssistantChat {
  const { user } = useAuth()
  const [restored, setRestored] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // El usuario llega de forma asíncrona (/me), así que la restauración espera a
  // tenerlo: sin id no se sabe de quién es la conversación guardada.
  useEffect(() => {
    if (restored || !user?.id) return
    const persisted = readPersisted(user.id)
    setIsOpen(persisted.isOpen)
    setConversationId(persisted.conversationId)
    setRestored(true)
  }, [restored, user?.id])

  useEffect(() => {
    if (!restored || !user?.id) return
    localStorage.setItem(storageKey(user.id), JSON.stringify({ isOpen, conversationId }))
  }, [restored, user?.id, isOpen, conversationId])
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)

  // El historial sólo se pide con el panel abierto: cerrado no hay nada que pintar.
  const { data: messages = [] } = useChatMessages(isOpen ? conversationId : null)
  const sendMessage = useSendChatMessage()

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || sendMessage.isPending) return
      setError(null)
      setLastQuestion(message)
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
    conversationId,
    messages,
    pending,
    lastQuestion,
    status: sendMessage.isPending ? 'streaming' : error ? 'error' : 'idle',
    error,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => {
      setIsOpen(false)
      setIsExpanded(false)
    }, []),
    toggleExpanded: useCallback(() => setIsExpanded((v) => !v), []),
    newConversation,
    openConversation: useCallback((id: string) => {
      setConversationId(id)
      setError(null)
    }, []),
    send,
  }
}
