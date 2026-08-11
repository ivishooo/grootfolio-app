/**
 * Helpers de acciones de administración (F2): cálculo de la fecha de fin de
 * suspensión por preset, escritura en el audit log (append-only) y creación de
 * notificaciones in-app.
 */
import { DateTime } from 'luxon'
import AdminAuditLog from '#models/admin_audit_log'
import Notification from '#models/notification'

export type SuspensionDuration = '24h' | '7d' | '30d' | 'custom' | 'forever'

/**
 * Fecha hasta la que dura la suspensión. `forever` ⇒ null (indefinida).
 * `custom` usa `until` (ISO); devuelve null si no vino (el controller ya lo
 * exige antes de llamar).
 */
export function computeSuspendedUntil(
  duration: SuspensionDuration,
  until?: string
): DateTime | null {
  switch (duration) {
    case '24h':
      return DateTime.now().plus({ hours: 24 })
    case '7d':
      return DateTime.now().plus({ days: 7 })
    case '30d':
      return DateTime.now().plus({ days: 30 })
    case 'custom':
      return until ? DateTime.fromISO(until) : null
    case 'forever':
      return null
  }
}

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.suspend'
  | 'user.unsuspend'
  | 'user.avatar_delete'
  | 'user.rename'
  | 'content.publish'
  | 'content.delete'
  | 'content.section_create'
  | 'kb.create'
  | 'kb.update'
  | 'kb.publish'
  | 'kb.unpublish'
  | 'kb.delete'

export async function writeAudit(entry: {
  actorId: string
  action: AuditAction
  targetType: string
  targetId?: string | null
  targetLabel: string
  reason?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<void> {
  await AdminAuditLog.create({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    targetLabel: entry.targetLabel,
    reason: entry.reason ?? null,
    metadata: entry.metadata ?? null,
  })
}

export async function createNotification(
  userId: string,
  type: 'content.published' | 'profile.moderated' | 'account.suspended',
  title: string,
  body?: string | null,
  data?: Record<string, unknown> | null
): Promise<void> {
  await Notification.create({
    userId,
    type,
    title,
    body: body ?? null,
    data: data ?? null,
  })
}
