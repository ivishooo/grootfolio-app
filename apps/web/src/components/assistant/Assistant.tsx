/**
 * Asistente de GrootFolio (rediseño). Compone launcher + panel y les pasa el
 * estado del hook. El panel arranca cerrado y al cerrarlo el foco vuelve al
 * launcher.
 */
import { useEffect, useRef } from 'react'
import { AssistantLauncher } from './AssistantLauncher'
import { AssistantPanel } from './AssistantPanel'
import { ConversationRail } from './ConversationRail'
import { MessageList } from './MessageList'
import { Composer } from './Composer'
import { SuggestionCards } from './SuggestionCards'
import { useAssistantChat } from './useAssistantChat'
import './tokens.css'

export function Assistant() {
  const chat = useAssistantChat()
  const launcherRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  // Al cerrar, devolver el foco al launcher (requisito de accesibilidad).
  useEffect(() => {
    if (wasOpen.current && !chat.isOpen) {
      launcherRef.current?.querySelector('button')?.focus()
    }
    wasOpen.current = chat.isOpen
  }, [chat.isOpen])

  if (!chat.isOpen) {
    return (
      <div ref={launcherRef}>
        <AssistantLauncher onOpen={chat.open} isOpen={false} />
      </div>
    )
  }

  const ask = (text: string) => void chat.send(text).catch(() => {})

  return (
    <AssistantPanel
      onClose={chat.close}
      onNewConversation={chat.messages.length > 0 ? chat.newConversation : undefined}
      onToggleExpanded={chat.toggleExpanded}
      isExpanded={chat.isExpanded}
      rail={
        <ConversationRail
          activeId={chat.conversationId}
          onSelect={chat.openConversation}
          onNew={chat.newConversation}
        />
      }
    >
      <MessageList
        messages={chat.messages}
        pending={chat.pending}
        isStreaming={chat.status === 'streaming'}
        error={chat.error}
        onRetry={chat.lastQuestion ? () => ask(chat.lastQuestion!) : undefined}
        onRetryMessage={(index) => {
          // La pregunta que originó la respuesta es el mensaje inmediatamente
          // anterior del usuario.
          const previous = chat.messages[index - 1]
          if (previous?.role === 'user') ask(previous.content)
        }}
        empty={<SuggestionCards onPick={ask} />}
      />

      <Composer onSend={ask} isStreaming={chat.status === 'streaming'} />
    </AssistantPanel>
  )
}
