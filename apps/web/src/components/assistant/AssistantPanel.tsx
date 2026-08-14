/**
 * Shell del panel del asistente (rediseño, PR 1): overlay, contenedor, header y
 * foco. El contenido (mensajes, composer) sigue viniendo de afuera — el panel es
 * "tonto", como pide el spec.
 *
 * Lo que resuelve de la ventana anterior:
 *  - **Jerarquía**: overlay + sombra, para que se lea como una capa y no como
 *    algo pegado encima de las tarjetas de KPI.
 *  - **Identidad**: avatar, nombre de producto y señal de disponibilidad, con el
 *    header separado del cuerpo por un divisor.
 *  - **Accesibilidad**: `role="dialog"`, Esc cierra y devuelve el foco al
 *    launcher, y los íconos tienen área de toque de 44 px en móvil. En la vista
 *    ampliada el foco además queda atrapado dentro del panel, porque ahí es
 *    `aria-modal`: prometer modalidad al lector de pantalla y dejar que el Tab
 *    se escape a la página de atrás es peor que no prometerla.
 */
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  onClose: () => void
  onNewConversation?: () => void
  onToggleExpanded?: () => void
  isExpanded?: boolean
  /** Rail de historial: sólo se muestra en la vista ampliada. */
  rail?: ReactNode
  children: ReactNode
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      // 44px de área de toque aunque el ícono sea de 20: regla dura del spec.
      className="flex h-11 w-11 items-center justify-center rounded-[var(--gf-r-icon)] text-[color:var(--gf-ink-3)] transition-colors hover:bg-[color:var(--gf-line)] hover:text-[color:var(--gf-ink)] sm:h-9 sm:w-9"
    >
      {children}
    </button>
  )
}

export function AssistantPanel({
  onClose,
  onNewConversation,
  onToggleExpanded,
  isExpanded = false,
  rail,
  children,
}: Props) {
  const panelRef = useRef<HTMLElement>(null)

  // Esc cierra. El foco vuelve al launcher desde el componente padre, que es
  // quien sabe si el launcher volvió a montarse.
  //
  // Con la vista ampliada, Tab cicla dentro del panel: es `aria-modal`, así que
  // el foco no puede caerse a la página de atrás.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !isExpanded) return

      const panel = panelRef.current
      if (!panel) return

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null)

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      const active = document.activeElement

      // Salir por cualquiera de los dos extremos vuelve a entrar por el otro.
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (!panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, isExpanded])

  // Al abrir, el foco entra al panel para que el teclado no siga en la página.
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return (
    <>
      <div className="gf-overlay" onClick={onClose} aria-hidden="true" />

      <section
        ref={panelRef}
        tabIndex={-1}
        className="gf-panel focus:outline-none"
        role="dialog"
        aria-label="Asistente GrootFolio"
        aria-modal={isExpanded || undefined}
        data-expanded={isExpanded}
      >
        <header className="flex items-center gap-3 border-b border-[color:var(--gf-line)] px-4 py-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--gf-accent-soft)] text-sm font-bold text-[color:var(--gf-accent)]"
            aria-hidden="true"
          >
            G
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[color:var(--gf-ink)]">
              Asistente GrootFolio
            </p>
            <p className="flex items-center gap-1.5 text-xs text-[color:var(--gf-ink-3)]">
              <i className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
              En línea
            </p>
          </div>

          {onNewConversation && (
            <IconButton label="Nueva conversación" onClick={onNewConversation}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </IconButton>
          )}

          {onToggleExpanded && (
            <IconButton
              label={isExpanded ? 'Reducir' : 'Ampliar'}
              onClick={onToggleExpanded}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                {isExpanded ? (
                  <path d="M9 3v6H3M15 21v-6h6M3 15h6v6M21 9h-6V3" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                )}
              </svg>
            </IconButton>
          )}

          <IconButton label="Cerrar el asistente" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </header>

        <div className="flex min-h-0 flex-1">
          {isExpanded && rail}
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </section>
    </>
  )
}
