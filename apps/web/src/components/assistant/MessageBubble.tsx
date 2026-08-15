/**
 * Burbuja de mensaje (rediseño, PR 2).
 *
 * Reglas del spec que se aplican acá:
 *  - **Nunca dos naranjas compitiendo**: sólo la burbuja del usuario es naranja;
 *    la del asistente es neutra con borde.
 *  - **Texto ≥ 14 px y nunca gris claro sobre blanco**: el cuerpo usa `--gf-ink`.
 *  - La respuesta del asistente lleva avatar al costado, para que se lea de quién
 *    viene sin depender sólo de la alineación.
 */
import type { ReactNode } from 'react'
import type { ChatMessage } from '@grootfolio/shared'
import { Markdown } from '@/components/ui/Markdown'

export function BotAvatar() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--gf-accent-soft)] text-[11px] font-bold text-[color:var(--gf-accent)]"
      aria-hidden="true"
    >
      G
    </div>
  )
}

/** Fila del asistente: avatar + columna de contenido (burbuja, fuentes, acciones). */
export function BotRow({ children }: { children: ReactNode }) {
  return (
    <div className="group flex items-start gap-2">
      <BotAvatar />
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
    </div>
  )
}

export function UserBubble({ content, muted = false }: { content: string; muted?: boolean }) {
  return (
    <div className="flex justify-end">
      <div
        className={`max-w-[86%] rounded-[var(--gf-r-bubble)] bg-[color:var(--gf-accent)] px-3.5 py-2.5 text-sm leading-relaxed text-white ${
          muted ? 'opacity-70' : ''
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

export function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[92%] rounded-[var(--gf-r-bubble)] border border-[color:var(--gf-bubble-bot-border)] bg-[color:var(--gf-bubble-bot)] px-3.5 py-2.5 text-sm leading-relaxed text-[color:var(--gf-ink)]">
      {children}
    </div>
  )
}

/**
 * Error como burbuja del asistente, no como banda suelta: mantiene el hilo de la
 * conversación y deja la acción de reintentar al lado del mensaje que falló.
 */
export function ErrorBubble({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <BotRow>
      <div className="max-w-[92%] rounded-[var(--gf-r-bubble)] border border-[#DC2626]/25 bg-[#DC2626]/[0.06] px-3.5 py-2.5 text-sm leading-relaxed text-[color:var(--gf-ink)]">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg border border-[color:var(--gf-border)] bg-[color:var(--gf-surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--gf-ink-2)] transition-colors hover:border-[color:var(--gf-accent)] hover:text-[color:var(--gf-accent)]"
          >
            Reintentar
          </button>
        )}
      </div>
    </BotRow>
  )
}

export function MessageBubble({ message, children }: { message: ChatMessage; children?: ReactNode }) {
  if (message.role === 'user') return <UserBubble content={message.content} />
  return (
    <BotRow>
      <BotBubble>
        <Markdown source={message.content} />
      </BotBubble>
      {children}
    </BotRow>
  )
}
