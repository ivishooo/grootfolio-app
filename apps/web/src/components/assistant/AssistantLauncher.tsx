/**
 * Launcher del asistente (rediseño, PR 1). Botón fijo abajo a la derecha con
 * punto de estado: el panel arranca **cerrado**, que era el problema 01 del
 * diagnóstico (nacía abierto y se leía como un bug encima de los KPI).
 */
interface Props {
  onOpen: () => void
  /** Se refleja en aria-expanded para que el lector de pantalla anuncie el estado. */
  isOpen: boolean
}

export function AssistantLauncher({ onOpen, isOpen }: Props) {
  return (
    <button
      type="button"
      className="gf-launcher"
      onClick={onOpen}
      aria-label="Abrir el asistente"
      aria-expanded={isOpen}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
      </svg>
      <span className="gf-launcher-dot" aria-hidden="true" />
    </button>
  )
}
