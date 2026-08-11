/**
 * KbAdminController (F2, Chatbot RAG — ADR-0004). CRUD de los artículos de la
 * base de conocimiento que alimenta al chatbot. Todo bajo `/admin/kb` con
 * `auth` + `admin` middleware. Cada acción escribe en `admin_audit_logs`.
 *
 * Desde F3 la publicación dispara además la **indexación** (chunking +
 * embeddings). La indexación es sincrónica pero **no bloquea la acción**: si
 * falla, el artículo igual queda publicado/editado y el motivo viaja en
 * `indexingError` para que el panel lo muestre y se pueda reintentar con
 * `node ace kb:reindex`.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import KbArticle from '#models/kb_article'
import { writeAudit } from '#services/admin/admin_actions'
import {
  countChunksByArticle,
  kbStats,
  serializeKbArticle,
  serializeKbArticleListItem,
  uniqueSlug,
} from '#services/kb/kb_articles'
import { clearArticleIndex, reindexArticle } from '#services/kb/rag_ingest_service'
import { createKbArticleValidator, updateKbArticleValidator } from '#validators/kb'

export default class KbAdminController {
  /** GET /admin/kb/articles — lista con filtros por estado y búsqueda. */
  async index({ request, response }: HttpContext) {
    const status = request.input('status')
    const search = String(request.input('search', '')).trim()

    const query = KbArticle.query().orderBy('updated_at', 'desc')
    if (status === 'draft' || status === 'published') query.where('status', status)
    if (search) {
      query.where((b) => {
        b.whereILike('title', `%${search}%`).orWhereILike('body', `%${search}%`)
      })
    }

    const articles = await query
    const counts = await countChunksByArticle(articles.map((a) => a.id))
    const data = articles.map((a) => serializeKbArticleListItem(a, counts.get(a.id) ?? 0))

    // Los totales son globales (no del resultado filtrado): el panel muestra
    // siempre cuántos artículos hay publicados y en borrador.
    return response.status(200).send({ data, stats: await kbStats() })
  }

  /** POST /admin/kb/articles — alta. Slug autogenerado del título si no viene. */
  async store({ request, response, currentUser }: HttpContext) {
    const payload = await request.validateUsing(createKbArticleValidator)

    // Un slug explícito que ya existe es un error del admin (409); el derivado
    // del título se desambigua solo con sufijo.
    if (payload.slug && (await KbArticle.findBy('slug', payload.slug))) {
      return response.status(409).send({ code: 'KB_SLUG_TAKEN', message: 'Ya existe un artículo con ese slug.' })
    }
    const slug = payload.slug ?? (await uniqueSlug(payload.title))

    const publish = payload.publish === true
    const article = await KbArticle.create({
      title: payload.title,
      slug,
      body: payload.body,
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? DateTime.now() : null,
      createdBy: currentUser.id,
    })

    await writeAudit({
      actorId: currentUser.id,
      action: publish ? 'kb.publish' : 'kb.create',
      targetType: 'kb_article',
      targetId: article.id,
      targetLabel: article.title,
      metadata: { slug: article.slug, status: article.status },
    })

    if (publish) await this.tryReindex(article)

    const counts = await countChunksByArticle([article.id])
    return response.status(201).send({ article: serializeKbArticle(article, counts.get(article.id) ?? 0) })
  }

  /** GET /admin/kb/articles/:id — detalle con el markdown completo. */
  async show({ params, response }: HttpContext) {
    const article = await KbArticle.find(params.id)
    if (!article) return this.notFound(response)

    const counts = await countChunksByArticle([article.id])
    return response.status(200).send({ article: serializeKbArticle(article, counts.get(article.id) ?? 0) })
  }

  /**
   * PATCH /admin/kb/articles/:id — edición parcial (título, slug, cuerpo). El
   * estado no se toca acá: para eso están publish/unpublish.
   */
  async update({ params, request, response, currentUser }: HttpContext) {
    const article = await KbArticle.find(params.id)
    if (!article) return this.notFound(response)

    const payload = await request.validateUsing(updateKbArticleValidator)

    // VineJS no tiene el `refine` del schema Zod: un PATCH sin campos pasa la
    // validación, así que lo cortamos acá.
    if (Object.values(payload).every((field) => field === undefined)) {
      return response.status(422).send({ code: 'KB_NO_CHANGES', message: 'No hay cambios para aplicar.' })
    }

    if (payload.slug && payload.slug !== article.slug) {
      const clash = await KbArticle.findBy('slug', payload.slug)
      if (clash && clash.id !== article.id) {
        return response.status(409).send({ code: 'KB_SLUG_TAKEN', message: 'Ya existe un artículo con ese slug.' })
      }
    }

    const changed: string[] = []
    if (payload.title !== undefined && payload.title !== article.title) {
      article.title = payload.title
      changed.push('title')
    }
    if (payload.slug !== undefined && payload.slug !== article.slug) {
      article.slug = payload.slug
      changed.push('slug')
    }
    if (payload.body !== undefined && payload.body !== article.body) {
      article.body = payload.body
      changed.push('body')
    }
    await article.save()

    // Un PATCH con los mismos valores no ensucia el audit log.
    if (changed.length > 0) {
      await writeAudit({
        actorId: currentUser.id,
        action: 'kb.update',
        targetType: 'kb_article',
        targetId: article.id,
        targetLabel: article.title,
        metadata: { changed },
      })
    }

    // El texto vectorizado incluye título y secciones, así que tanto un cambio
    // de body como de título invalidan los fragmentos de un artículo publicado.
    if (article.status === 'published' && (changed.includes('body') || changed.includes('title'))) {
      await this.tryReindex(article)
    }

    const counts = await countChunksByArticle([article.id])
    return response.status(200).send({ article: serializeKbArticle(article, counts.get(article.id) ?? 0) })
  }

  /** DELETE /admin/kb/articles/:id — borra el artículo (sus chunks caen en cascada). */
  async destroy({ params, response, currentUser }: HttpContext) {
    const article = await KbArticle.find(params.id)
    if (!article) return this.notFound(response)

    const { id, title, slug } = article
    await article.delete()

    await writeAudit({
      actorId: currentUser.id,
      action: 'kb.delete',
      targetType: 'kb_article',
      targetId: id,
      targetLabel: title,
      metadata: { slug },
    })

    return response.status(204).send(null)
  }

  /**
   * POST /admin/kb/articles/:id/publish — el artículo pasa a alimentar al bot.
   * En F3 esta acción dispara además la reindexación (chunking + embeddings).
   */
  async publish({ params, response, currentUser }: HttpContext) {
    const article = await KbArticle.find(params.id)
    if (!article) return this.notFound(response)

    article.status = 'published'
    if (!article.publishedAt) article.publishedAt = DateTime.now()
    await article.save()

    await writeAudit({
      actorId: currentUser.id,
      action: 'kb.publish',
      targetType: 'kb_article',
      targetId: article.id,
      targetLabel: article.title,
      metadata: { slug: article.slug },
    })

    await this.tryReindex(article)

    const counts = await countChunksByArticle([article.id])
    return response.status(200).send({ article: serializeKbArticle(article, counts.get(article.id) ?? 0) })
  }

  /**
   * POST /admin/kb/articles/:id/unpublish — lo saca de la KB activa sin
   * borrarlo. Elimina también sus fragmentos vectorizados: un artículo
   * despublicado no puede seguir alimentando las respuestas del bot.
   */
  async unpublish({ params, response, currentUser }: HttpContext) {
    const article = await KbArticle.find(params.id)
    if (!article) return this.notFound(response)

    article.status = 'draft'
    article.indexedAt = null
    article.indexingError = null
    await article.save()
    await clearArticleIndex(article.id)

    await writeAudit({
      actorId: currentUser.id,
      action: 'kb.unpublish',
      targetType: 'kb_article',
      targetId: article.id,
      targetLabel: article.title,
      metadata: { slug: article.slug },
    })

    const counts = await countChunksByArticle([article.id])
    return response.status(200).send({ article: serializeKbArticle(article, counts.get(article.id) ?? 0) })
  }

  private notFound(response: HttpContext['response']) {
    return response.status(404).send({ code: 'KB_ARTICLE_NOT_FOUND', message: 'Artículo no encontrado.' })
  }

  /**
   * Reindexa sin propagar el fallo: la acción del admin (publicar, editar) ya
   * se aplicó y no se revierte porque el proveedor de IA esté caído. El motivo
   * queda persistido en `indexingError` (lo escribe el servicio) y el panel lo
   * muestra; se reintenta con `kb:reindex`.
   */
  private async tryReindex(article: KbArticle): Promise<void> {
    try {
      await reindexArticle(article)
    } catch {
      // Ya quedó registrado en article.indexingError y en el log del servicio.
    }
  }
}
