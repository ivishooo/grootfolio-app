/**
 * Notificaciones (rediseño v2, Fase 6). SPEC-pantallas › Notificaciones.
 * Antes era un dropdown de la campanita; el prototipo la lleva a una pantalla
 * propia (máx. 680). Fila de padding 14 y radio 14, ícono de 30 por tipo; las no
 * leídas van con fondo brand.tint, título 600 y punto de 8 brand.solid.
 *
 * El tipo `groot.drop` («Groot: Ethereum bajó 6 % hoy») no existe todavía:
 * depende de la variación diaria en `GET /portfolio`.
 */
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '@grootfolio/shared'
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from '@/lib/queries'
import { EmptyState } from '@/components/ui/States'
import { NOTIF_ICONS, relativeTime } from './notif-meta'

export function NotificationsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkNotificationRead()
  const notifs = data?.data ?? []
  const unread = data?.unreadCount ?? 0

  const open = (n: AppNotification) => {
    if (!n.readAt) markOne.mutate(n.id)
    if (n.type === 'content.published') navigate('/content')
    else if (n.type === 'profile.moderated') navigate('/settings')
  }

  return (
    <div className="mx-auto grid w-full max-w-[680px] gap-3">
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 flex-1 text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Notificaciones</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="h-9 rounded-lg px-2.5 text-[13px] font-semibold text-brand-ink hover:bg-brand-tint"
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : notifs.length === 0 ? (
        <EmptyState title="Sin notificaciones" description="Cuando haya novedades, aparecen acá." />
      ) : (
        notifs.map((n) => {
          const m = NOTIF_ICONS[n.type]
          const isUnread = !n.readAt
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className={`flex items-start gap-3 rounded-[14px] border border-line p-3.5 text-left text-ink transition-colors hover:border-ctl ${
                isUnread ? 'bg-brand-tint' : 'bg-surface'
              }`}
            >
              <span
                aria-hidden="true"
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: m.color }}
              >
                {m.icon}
              </span>
              <div className="grid min-w-0 flex-1 gap-0.5">
                <p className={`m-0 text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                {n.body && <p className="m-0 text-[13px] leading-snug text-ink-2">{n.body}</p>}
                <p className="m-0 mt-0.5 text-[11.5px] text-ink-3">{relativeTime(n.createdAt)}</p>
              </div>
              {isUnread && (
                <>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                  <span className="sr-only">Sin leer</span>
                </>
              )}
            </button>
          )
        })
      )}
    </div>
  )
}
