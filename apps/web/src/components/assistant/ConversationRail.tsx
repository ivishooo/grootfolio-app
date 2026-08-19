/**
 * Rail de historial (rediseño, PR 5). Sólo aparece en la vista ampliada, donde
 * hay ancho para mostrarlo sin comerle espacio a la conversación.
 *
 * Cierra el problema 06 del diagnóstico: antes, al cerrar el panel se perdía
 * todo. Ahora las conversaciones anteriores están a un clic.
 */
import { useChatConversations, useDeleteChatConversation } from '@/lib/queries'

interface Props {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export function ConversationRail({ activeId, onSelect, onNew }: Props) {
  const { data: conversations = [], isLoading } = useChatConversations()
  const remove = useDeleteChatConversation()

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-[color:var(--gf-line)]">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[color:var(--gf-accent-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--gf-accent-strong-hover)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva conversación
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label="Conversaciones anteriores">
        {isLoading ? (
          <p className="px-2 py-1 text-xs text-[color:var(--gf-ink-3)]">Cargando…</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-1 text-xs text-[color:var(--gf-ink-3)]">
            Todavía no hay conversaciones.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const active = conversation.id === activeId
              return (
                <li key={conversation.id} className="group/item relative">
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={active}
                    className={`w-full rounded-lg px-2.5 py-2 pr-8 text-left transition-colors ${
                      active
                        ? 'bg-[color:var(--gf-accent-soft)]'
                        : 'hover:bg-[color:var(--gf-line)]'
                    }`}
                  >
                    <span className="block truncate text-xs font-medium text-[color:var(--gf-ink)]">
                      {conversation.title ?? 'Conversación'}
                    </span>
                    <span className="block text-[10.5px] text-[color:var(--gf-ink-3)]">
                      {formatDate(conversation.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(conversation.id)}
                    aria-label={`Borrar "${conversation.title ?? 'Conversación'}"`}
                    className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[color:var(--gf-ink-3)] opacity-0 transition-opacity hover:text-[#DC2626] focus:opacity-100 group-hover/item:opacity-100"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </aside>
  )
}
