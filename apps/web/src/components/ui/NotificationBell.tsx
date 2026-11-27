/**
 * Campanita del header (rediseño v2, Fase 6). Lleva a /notifications, como en el
 * prototipo; el punto rojo indica que hay no leídas.
 */
import { Link } from 'react-router-dom'
import { useNotifications } from '@/lib/queries'

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  )
}

export function NotificationBell() {
  const { data } = useNotifications()
  const unread = data?.unreadCount ?? 0
  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
      className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-line bg-surface text-ink transition-colors hover:bg-muted"
    >
      <BellIcon />
      {unread > 0 && <span className="absolute right-2 top-[7px] h-2 w-2 rounded-full border-2 border-surface bg-[#EF4444]" aria-hidden="true" />}
    </Link>
  )
}
