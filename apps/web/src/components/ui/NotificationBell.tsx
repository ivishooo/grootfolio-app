/**
 * Campanita de notificaciones (F6). Botón en el header con punto rojo si hay no
 * leídas; dropdown con la lista, "Marcar todas leídas", y navegación a
 * /content al tocar una notificación de contenido. Cierra al clic afuera.
 */
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '@grootfolio/shared'
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from '@/lib/queries'
import { useOnClickOutside } from '@/lib/useOnClickOutside'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  )
}

const ICONS: Record<AppNotification['type'], { icon: string; color: string }> = {
  'content.published': { icon: '↑', color: '#F97316' },
  'profile.moderated': { icon: '⚐', color: '#D97706' },
  'account.suspended': { icon: '⊘', color: '#DC2626' },
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, () => setOpen(false))
  const navigate = useNavigate()
  const { data } = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkNotificationRead()

  const unread = data?.unreadCount ?? 0
  const notifs = data?.data ?? []

  const onClick = (n: AppNotification) => {
    if (!n.readAt) markOne.mutate(n.id)
    if (n.type === 'content.published') {
      setOpen(false)
      navigate('/content')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative grid h-8 w-8 place-items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <BellIcon />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          style={{ animation: 'gf-fade-down .16s ease' }}
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <span className="font-semibold">Notificaciones</span>
            {unread > 0 && (
              <button className="text-xs font-semibold text-brand-500 hover:underline" onClick={() => markAll.mutate()}>
                Marcar todas leídas
              </button>
            )}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">No tenés notificaciones.</p>
            ) : (
              notifs.map((n) => {
                const meta = ICONS[n.type]
                return (
                  <button
                    key={n.id}
                    onClick={() => onClick(n)}
                    className="flex w-full items-start gap-3 border-b border-neutral-100 px-4 py-3 text-left last:border-0 hover:bg-neutral-50 dark:border-neutral-700/50 dark:hover:bg-neutral-700/30"
                    style={!n.readAt ? { background: 'rgba(249,115,22,0.05)' } : undefined}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: meta.color }}>
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="truncate text-xs text-neutral-500">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-neutral-400">{relativeTime(n.createdAt)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <style>{`@keyframes gf-fade-down{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>
        </div>
      )}
    </div>
  )
}
