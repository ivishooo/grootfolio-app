/**
 * AdminContentController (F3). Gestión de secciones e items de contenido para
 * admins. Bajo `/admin/content` (auth + admin). Escribe audit en publish/delete/
 * section_create.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ContentSection from '#models/content_section'
import ContentItem from '#models/content_item'
import { writeAudit } from '#services/admin/admin_actions'
import { serializeContentItem } from '#services/content/content_serializer'
import { notifyContentPublished } from '#services/content/content_notifier'
import {
  UploadValidationError,
  deleteUpload,
  saveUpload,
  type UploadKind,
} from '#services/content_storage'
import {
  createContentItemValidator,
  createSectionValidator,
  pinContentValidator,
  publishContentValidator,
  updateContentItemValidator,
  updateSectionValidator,
} from '#validators/content'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140)
}

export default class AdminContentController {
  // --- Secciones ---

  async createSection({ request, response, currentUser }: HttpContext) {
    const payload = await request.validateUsing(createSectionValidator)
    let slug = slugify(payload.name) || 'seccion'
    // slug único: sufijo incremental si choca.
    let n = 1
    while (await ContentSection.findBy('slug', slug)) {
      slug = `${slugify(payload.name)}-${n++}`
    }
    const maxPos = await ContentSection.query().orderBy('position', 'desc').first()
    const section = await ContentSection.create({
      name: payload.name,
      slug,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
      position: (maxPos?.position ?? -1) + 1,
    })
    await writeAudit({
      actorId: currentUser.id,
      action: 'content.section_create',
      targetType: 'content_section',
      targetId: section.id,
      targetLabel: section.name,
    })
    return response.status(201).send({ section: section.serialize() })
  }

  async updateSection({ params, request, response }: HttpContext) {
    const section = await ContentSection.find(params.id)
    if (!section) return response.status(404).send({ code: 'SECTION_NOT_FOUND', message: 'Sección no encontrada.' })
    const payload = await request.validateUsing(updateSectionValidator)
    if (payload.name !== undefined) section.name = payload.name
    if (payload.icon !== undefined) section.icon = payload.icon
    if (payload.color !== undefined) section.color = payload.color
    await section.save()
    return response.status(200).send({ section: section.serialize() })
  }

  async deleteSection({ params, request, response }: HttpContext) {
    const section = await ContentSection.find(params.id)
    if (!section) return response.status(404).send({ code: 'SECTION_NOT_FOUND', message: 'Sección no encontrada.' })

    const items = await ContentItem.query().where('section_id', section.id)
    const force = request.input('force') === 'true' || request.input('force') === true
    if (items.length > 0 && !force) {
      return response.status(422).send({
        code: 'SECTION_NOT_EMPTY',
        message: 'La sección tiene contenido. Reintentá con force=true para moverlo o borrarlo.',
      })
    }

    if (items.length > 0) {
      // force: mover a otra sección si existe; si no, borrar los items (y sus archivos).
      const other = await ContentSection.query().whereNot('id', section.id).orderBy('position', 'asc').first()
      if (other) {
        await ContentItem.query().where('section_id', section.id).update({ section_id: other.id })
      } else {
        for (const item of items) await deleteUpload(item.storageKey)
        await ContentItem.query().where('section_id', section.id).delete()
      }
    }

    await section.delete()
    return response.status(204).send(null)
  }

  // --- Items ---

  /** GET /admin/content/items — todos (incluye borradores). */
  async listItems(ctx: HttpContext) {
    const { request, response } = ctx
    const sectionId = request.input('sectionId')
    const status = request.input('status')
    const search = String(request.input('search', '')).trim()

    const query = ContentItem.query().preload('section').orderBy('created_at', 'desc')
    if (sectionId) query.where('section_id', sectionId)
    if (status === 'draft' || status === 'published') query.where('status', status)
    if (search) query.whereILike('title', `%${search}%`)

    const items = await query
    const data = items.map((item) => serializeContentItem(ctx, item))
    return response.status(200).send({ data })
  }

  async createItem(ctx: HttpContext) {
    const { request, response, currentUser } = ctx
    const payload = await request.validateUsing(createContentItemValidator)

    const section = await ContentSection.find(payload.sectionId)
    if (!section) return response.status(404).send({ code: 'SECTION_NOT_FOUND', message: 'Sección no encontrada.' })

    let storageKey: string | null = null
    let mimeType: string | null = null
    let sizeBytes: number | null = null
    let externalUrl: string | null = null

    if (payload.type === 'link') {
      if (!payload.externalUrl) {
        return response.status(422).send({ code: 'LINK_URL_REQUIRED', message: 'Indicá la URL del enlace.' })
      }
      externalUrl = payload.externalUrl
    } else {
      const file = request.file('file')
      if (!file) {
        return response.status(422).send({ code: 'FILE_REQUIRED', message: 'Adjuntá el archivo.' })
      }
      try {
        const saved = await saveUpload(file, payload.type as UploadKind, `content/${section.slug}`)
        storageKey = saved.key
        mimeType = saved.mimeType
        sizeBytes = saved.sizeBytes
      } catch (err) {
        if (err instanceof UploadValidationError) {
          return response.status(422).send({ code: err.code, message: err.message })
        }
        throw err
      }
    }

    const publish = payload.publish === true
    const item = await ContentItem.create({
      sectionId: section.id,
      type: payload.type,
      title: payload.title,
      description: payload.description ?? null,
      storageKey,
      externalUrl,
      mimeType,
      sizeBytes,
      status: publish ? 'published' : 'draft',
      pinned: false,
      viewsCount: 0,
      publishedAt: publish ? DateTime.now() : null,
      createdBy: currentUser.id,
    })

    if (publish) {
      await writeAudit({
        actorId: currentUser.id,
        action: 'content.publish',
        targetType: 'content_item',
        targetId: item.id,
        targetLabel: item.title,
      })
      if (payload.notifyUsers) await notifyContentPublished(item, section.name)
    }

    await item.load('section')
    return response.status(201).send({ item: serializeContentItem(ctx, item) })
  }

  async updateItem(ctx: HttpContext) {
    const { params, request, response } = ctx
    const item = await ContentItem.find(params.id)
    if (!item) return response.status(404).send({ code: 'ITEM_NOT_FOUND', message: 'Contenido no encontrado.' })
    const payload = await request.validateUsing(updateContentItemValidator)
    if (payload.title !== undefined) item.title = payload.title
    if (payload.sectionId !== undefined) item.sectionId = payload.sectionId
    if (payload.description !== undefined) item.description = payload.description
    if (payload.externalUrl !== undefined && item.type === 'link') item.externalUrl = payload.externalUrl
    await item.save()
    await item.load('section')
    return response.status(200).send({ item: serializeContentItem(ctx, item) })
  }

  async deleteItem({ params, response, currentUser }: HttpContext) {
    const item = await ContentItem.find(params.id)
    if (!item) return response.status(404).send({ code: 'ITEM_NOT_FOUND', message: 'Contenido no encontrado.' })
    await deleteUpload(item.storageKey)
    const label = item.title
    const id = item.id
    await item.delete()
    await writeAudit({
      actorId: currentUser.id,
      action: 'content.delete',
      targetType: 'content_item',
      targetId: id,
      targetLabel: label,
    })
    return response.status(204).send(null)
  }

  async pinItem(ctx: HttpContext) {
    const { params, request, response } = ctx
    const item = await ContentItem.find(params.id)
    if (!item) return response.status(404).send({ code: 'ITEM_NOT_FOUND', message: 'Contenido no encontrado.' })
    const { pinned } = await request.validateUsing(pinContentValidator)
    item.pinned = pinned
    await item.save()
    await item.load('section')
    return response.status(200).send({ item: serializeContentItem(ctx, item) })
  }

  async publishItem(ctx: HttpContext) {
    const { params, request, response, currentUser } = ctx
    const item = await ContentItem.find(params.id)
    if (!item) return response.status(404).send({ code: 'ITEM_NOT_FOUND', message: 'Contenido no encontrado.' })
    const { notifyUsers } = await request.validateUsing(publishContentValidator)

    const wasPublished = item.status === 'published'
    item.status = 'published'
    if (!item.publishedAt) item.publishedAt = DateTime.now()
    await item.save()
    await item.load('section')

    await writeAudit({
      actorId: currentUser.id,
      action: 'content.publish',
      targetType: 'content_item',
      targetId: item.id,
      targetLabel: item.title,
    })
    // Solo notifica la primera vez que se publica (evita spam al republicar).
    if (notifyUsers && !wasPublished) await notifyContentPublished(item, item.section.name)

    return response.status(200).send({ item: serializeContentItem(ctx, item) })
  }
}
