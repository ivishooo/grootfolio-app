/**
 * NotificationsController (F3). Campanita in-app del usuario autenticado.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Notification from '#models/notification'

export default class NotificationsController {
  /** GET /notifications — paginado desc + unreadCount. */
  async index({ request, response, currentUser }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const perPage = Math.min(Number(request.input('perPage', 20)) || 20, 100)

    const paginated = await Notification.query()
      .where('user_id', currentUser.id)
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

    const unread = await Notification.query()
      .where('user_id', currentUser.id)
      .whereNull('read_at')
      .count('* as count')
    const unreadCount = Number(unread[0]?.$extras.count ?? 0)

    const data = paginated.all().map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      readAt: n.readAt?.toISO() ?? null,
      createdAt: n.createdAt.toISO(),
    }))

    return response.status(200).send({ data, meta: paginated.getMeta(), unreadCount })
  }

  /** POST /notifications/read-all */
  async readAll({ response, currentUser }: HttpContext) {
    await Notification.query()
      .where('user_id', currentUser.id)
      .whereNull('read_at')
      .update({ read_at: DateTime.now().toSQL() })
    return response.status(204).send(null)
  }

  /** POST /notifications/:id/read */
  async read({ params, response, currentUser }: HttpContext) {
    const notif = await Notification.query()
      .where('id', params.id)
      .where('user_id', currentUser.id)
      .first()
    if (!notif) {
      return response.status(404).send({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notificación no encontrada.' })
    }
    if (!notif.readAt) {
      notif.readAt = DateTime.now()
      await notif.save()
    }
    return response.status(204).send(null)
  }
}
