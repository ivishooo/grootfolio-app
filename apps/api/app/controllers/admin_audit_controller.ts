/**
 * AdminAuditController (F2). Lectura del audit log (append-only), paginado
 * descendente con el actor precargado. Bajo `/admin` (auth + admin).
 */
import type { HttpContext } from '@adonisjs/core/http'
import AdminAuditLog from '#models/admin_audit_log'

export default class AdminAuditController {
  /** GET /admin/audit-logs */
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const perPage = Math.min(Number(request.input('perPage', 20)) || 20, 100)

    const paginated = await AdminAuditLog.query()
      .preload('actor')
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

    const data = paginated.all().map((log) => ({
      id: log.id,
      actorName: log.actor?.fullName?.trim() || log.actor?.email || 'Sistema',
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      targetLabel: log.targetLabel,
      reason: log.reason,
      metadata: log.metadata,
      createdAt: log.createdAt.toISO(),
    }))

    return response.status(200).send({ data, meta: paginated.getMeta() })
  }
}
