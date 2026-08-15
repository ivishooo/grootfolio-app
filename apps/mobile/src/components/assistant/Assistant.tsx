/**
 * Asistente de GrootFolio en mobile: launcher flotante + panel, con la misma
 * forma que la burbuja de la web.
 *
 * Se monta al lado del `TabNavigator`, no dentro de una pantalla: así el
 * launcher acompaña a todas las tabs y no aparece en pantallas empujadas como
 * "Cargar activo", donde el usuario está en el medio de una tarea.
 */
import { AssistantLauncher } from './AssistantLauncher'
import { AssistantPanel } from './AssistantPanel'
import { MessageList } from './MessageList'
import { Composer } from './Composer'
import { SuggestionCards } from './SuggestionCards'
import { useAssistantChat } from './useAssistantChat'

export function Assistant() {
  const chat = useAssistantChat()
  const ask = (text: string) => void chat.send(text).catch(() => {})

  return (
    <>
      {!chat.isOpen && <AssistantLauncher onOpen={chat.open} />}

      <AssistantPanel
        visible={chat.isOpen}
        onClose={chat.close}
        onNewConversation={chat.messages.length > 0 ? chat.newConversation : undefined}
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
    </>
  )
}
