import type { AppNotification } from '@grootfolio/shared'

/** Ícono y color por tipo (SPEC: contenido «↑» naranja, moderación «⚐» ámbar). */
export const NOTIF_ICONS: Record<AppNotification['type'], { icon: string; color: string }> = {
  'content.published': { icon: '↑', color: '#F97316' },
  'profile.moderated': { icon: '⚐', color: '#D97706' },
  'account.suspended': { icon: '⊘', color: '#DC2626' },
}

export function relativeTime(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} d`
}
