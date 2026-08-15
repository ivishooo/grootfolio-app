/**
 * Estado del asistente en mobile. Espejo de
 * `apps/web/src/components/assistant/useAssistantChat.ts`: un solo hook, y el
 * launcher y el panel son componentes tontos que reciben todo desde acá.
 *
 * Se persiste **por usuario** (la conversación de una cuenta no debe aparecer
 * al iniciar sesión con otra en el mismo teléfono) y se guarda sólo el id de la
 * conversación, no los mensajes: la fuente de verdad es el servidor.
 *
 * A diferencia de la web no se persiste si el panel estaba abierto. En un
 * teléfono el asistente se abre a propósito desde el launcher; reabrirlo solo
 * al arrancar la app taparía la pantalla sin que nadie lo haya pedido.
 */
import { useCallback, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import type { ChatMessage } from '@grootfolio/shared'
import { useChatMessages, useSendChatMessage } from '@/lib/queries'
import { useAuth } from '@/auth/AuthProvider'

/** SecureStore sólo acepta [A-Za-z0-9._-] en la clave: el id va sin guiones. */
const storageKey = (userId: string) => `gf_assistant_${userId.replace(/[^A-Za-z0-9._-]/g, '')}`

export type AssistantStatus = 'idle' | 'streaming' | 'error'

export interface AssistantChat {
  isOpen: boolean
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
  newConversation: () => void
  send: (text: string) => Promise<void>
}

export function useAssistantChat(): AssistantChat {
  const { user } = useAuth()
  const [restored, setRestored] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)

  // El usuario llega de forma asíncrona (/me): sin id no se sabe de quién es la
  // conversación guardada.
  useEffect(() => {
    if (restored || !user?.id) return
    let cancelled = false
    void SecureStore.getItemAsync(storageKey(user.id))
      .then((saved) => {
        if (cancelled) return
        setConversationId(saved || null)
        setRestored(true)
      })
      .catch(() => setRestored(true))
    return () => {
      cancelled = true
    }
  }, [restored, user?.id])

  useEffect(() => {
    if (!restored || !user?.id) return
    const key = storageKey(user.id)
    void (conversationId
      ? SecureStore.setItemAsync(key, conversationId)
      : SecureStore.deleteItemAsync(key)
    ).catch(() => {})
  }, [restored, user?.id, conversationId])

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
      } finally {
        setPending(null)
      }
    },
    [conversationId, sendMessage]
  )

  return {
    isOpen,
    conversationId,
    messages,
    pending,
    lastQuestion,
    status: sendMessage.isPending ? 'streaming' : error ? 'error' : 'idle',
    error,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    newConversation: useCallback(() => {
      setConversationId(null)
      setError(null)
    }, []),
    send,
  }
}
