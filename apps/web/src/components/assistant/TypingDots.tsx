/**
 * Indicador de escritura (rediseño, PR 2). Tres puntos animados dentro de una
 * burbuja del asistente, en lugar del texto "Pensando…": ocupa el lugar de la
 * respuesta que está por llegar y no se confunde con contenido real.
 *
 * Respeta `prefers-reduced-motion`: sin animación, los puntos quedan fijos.
 */
import { BotRow } from './MessageBubble'

export function TypingDots() {
  return (
    <BotRow>
      <div
        className="inline-flex w-fit items-center gap-1 rounded-[var(--gf-r-bubble)] border border-[color:var(--gf-bubble-bot-border)] bg-[color:var(--gf-bubble-bot)] px-3.5 py-3"
        role="status"
        aria-label="El asistente está escribiendo"
      >
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="gf-typing-dot h-1.5 w-1.5 rounded-full bg-[color:var(--gf-ink-3)]"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </BotRow>
  )
}
