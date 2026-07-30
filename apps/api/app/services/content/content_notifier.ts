/**
 * ContentNotifier (F3). Al publicar un contenido con `notifyUsers`, crea una
 * notificación `content.published` para todos los usuarios activos (insert por
 * lotes para no armar un INSERT gigante). El push (F7) queda como TODO.
 */
import User from '#models/user'
import Notification from '#models/notification'
import type ContentItem from '#models/content_item'

const BATCH = 500

export async function notifyContentPublished(
  item: ContentItem,
  sectionName: string
): Promise<number> {
  const users = await User.query().where('status', 'active').select('id')
  const rows = users.map((u) => ({
    userId: u.id,
    type: 'content.published' as const,
    title: 'Nuevo contenido disponible',
    body: item.title,
    data: { contentItemId: item.id, sectionId: item.sectionId, sectionName },
  }))

  for (let i = 0; i < rows.length; i += BATCH) {
    await Notification.createMany(rows.slice(i, i + BATCH))
  }

  // TODO(push F7): enviar Expo Push a los push_tokens registrados.
  return rows.length
}
