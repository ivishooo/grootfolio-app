/**
 * Asistente de GrootFolio (rediseño, PR 1). Compone launcher + panel y les pasa
 * el estado del hook. Reemplaza al `ChatWidget` anterior.
 *
 * Cambio de comportamiento respecto de la versión previa: **el panel arranca
 * cerrado** y se abre desde el launcher, en vez de aparecer montado sobre el
 * contenido. Al cerrar, el foco vuelve al launcher.
 */
import { useEffect, useRef } from 'react'
import { AssistantLauncher } from './AssistantLauncher'
import { AssistantPanel } from './AssistantPanel'
import { MessageList } from './MessageList'
import { Composer } from './Composer'
import { useAssistantChat } from './useAssistantChat'
import './tokens.css'

const SUGERENCIAS = [
  '¿Cómo cargo una transacción?',
  '¿Qué es el P&L no realizado?',
  '¿Para qué sirve diversificar?',
]

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

  return (
    <AssistantPanel
      onClose={chat.close}
      onNewConversation={chat.messages.length > 0 ? chat.newConversation : undefined}
      isExpanded={chat.isExpanded}
    >
      <MessageList
        messages={chat.messages}
        pending={chat.pending}
        isStreaming={chat.status === 'streaming'}
        error={chat.error}
        empty={
          <div className="space-y-3 py-4">
            <p className="text-sm text-[color:var(--gf-ink-2)]">
              Preguntame sobre cómo usar GrootFolio o sobre los temas de inversión que
              documentamos. Si algo no está documentado, te lo voy a decir en vez de inventarlo.
            </p>
            <div className="space-y-1.5">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void chat.send(s).catch(() => {})}
                  className="block w-full rounded-lg border border-[color:var(--gf-border)] px-3 py-2 text-left text-sm text-[color:var(--gf-ink-2)] transition-colors hover:border-[color:var(--gf-accent)] hover:text-[color:var(--gf-accent)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <Composer
        onSend={(text) => void chat.send(text).catch(() => {})}
        disabled={chat.status === 'streaming'}
      />
    </AssistantPanel>
  )
}
