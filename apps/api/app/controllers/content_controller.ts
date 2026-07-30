/**
 * ContentController (F3). Biblioteca de contenidos para el usuario autenticado.
 * Solo publicados. Calcula `isNew` según las vistas del usuario y registra vistas.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import ContentSection from '#models/content_section'
import ContentItem from '#models/content_item'
import ContentView from '#models/content_view'
import { serializeContentItem } from '#services/content/content_serializer'

export default class ContentController {
  /** GET /content/sections — secciones con conteo de items publicados. */
  async sections({ response }: HttpContext) {
    const sections = await ContentSection.query().orderBy('position', 'asc')
    const counts = await db
      .from('content_items')
      .where('status', 'published')
      .groupBy('section_id')
      .select('section_id', db.raw('count(*)::int as c'))
    const byId = new Map<string, number>(counts.map((r: { section_id: string; c: number }) => [r.section_id, r.c]))

    const data = sections.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      color: s.color,
      itemsCount: byId.get(s.id) ?? 0,
    }))
    return response.status(200).send({ data })
  }

  /** GET /content/items — publicados, con isNew por usuario. */
  async items(ctx: HttpContext) {
    const { request, response, currentUser } = ctx
    const sectionId = request.input('sectionId')
    const search = String(request.input('search', '')).trim()

    const query = ContentItem.query()
      .preload('section')
      .where('status', 'published')
      .orderBy('pinned', 'desc')
      .orderBy('published_at', 'desc')
    if (sectionId) query.where('section_id', sectionId)
    if (search) query.whereILike('title', `%${search}%`)
    const items = await query

    const views = await ContentView.query().where('user_id', currentUser.id)
    const viewedSet = new Set(views.map((v) => v.contentItemId))
    const lastViewedAt = views.length
      ? views.reduce((max, v) => (v.viewedAt > max ? v.viewedAt : max), views[0]!.viewedAt)
      : DateTime.now()
    const cutoff = DateTime.now().minus({ days: 14 })

    const data = items.map((item) => {
      const published = item.publishedAt
      const isNew =
        !viewedSet.has(item.id) &&
        !!published &&
        (published > lastViewedAt || published >= cutoff)
      return serializeContentItem(ctx, item, { isNew })
    })
    return response.status(200).send({ data })
  }

  /** POST /content/items/:id/view — registra vista (una por usuario) + contador. */
  async view({ params, response, currentUser }: HttpContext) {
    const item = await ContentItem.find(params.id)
    if (!item || item.status !== 'published') {
      return response.status(404).send({ code: 'ITEM_NOT_FOUND', message: 'Contenido no encontrado.' })
    }
    const existing = await ContentView.query()
      .where('user_id', currentUser.id)
      .where('content_item_id', item.id)
      .first()
    if (existing) {
      existing.viewedAt = DateTime.now()
      await existing.save()
    } else {
      await ContentView.create({ userId: currentUser.id, contentItemId: item.id })
      item.viewsCount += 1
      await item.save()
    }
    return response.status(204).send(null)
  }
}
