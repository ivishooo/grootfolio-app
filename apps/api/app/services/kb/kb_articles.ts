/**
 * Helpers de la base de conocimiento del chatbot (F2, ADR-0004): slugs únicos,
 * extracto para el listado y serialización al contrato de `packages/shared`.
 * La vectorización (`chunksCount`/`indexed`) llega en F3; hasta entonces todo
 * artículo se serializa con 0 chunks.
 */
import db from '@adonisjs/lucid/services/db'
import KbArticle from '#models/kb_article'
import type { KbArticle as KbArticleDto, KbArticleListItem, KbStats } from '@grootfolio/shared/types'

const MAX_SLUG_LENGTH = 200
const EXCERPT_LENGTH = 180

/** Texto → slug de URL (sin acentos, sólo minúsculas/números/guiones). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
}

/**
 * Slug libre derivado de `base`. Si ya existe, agrega sufijo incremental
 * (`guia`, `guia-2`, …). `ignoreId` excluye al propio artículo cuando se edita.
 */
export async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || 'articulo'
  let candidate = root
  let n = 1
  while (true) {
    const query = KbArticle.query().where('slug', candidate)
    if (ignoreId) query.whereNot('id', ignoreId)
    const clash = await query.first()
    if (!clash) return candidate
    candidate = `${root}-${++n}`
  }
}

/**
 * Primeras líneas del markdown en texto plano. Saca encabezados, énfasis, links
 * y bloques de código para que la lista muestre algo legible.
 */
export function buildExcerpt(body: string): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ') // bloques de código
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links e imágenes → su texto
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // encabezados
    .replace(/^\s{0,3}[-*+]\s+/gm, '') // viñetas
    .replace(/[*_>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > EXCERPT_LENGTH ? `${plain.slice(0, EXCERPT_LENGTH).trimEnd()}…` : plain
}

/** Cantidad de chunks vectorizados por artículo (F3 los llena). */
export async function countChunksByArticle(articleIds: string[]): Promise<Map<string, number>> {
  if (articleIds.length === 0) return new Map()
  const rows = await db
    .from('kb_chunks')
    .whereIn('article_id', articleIds)
    .groupBy('article_id')
    .select('article_id', db.raw('count(*)::int as chunks_count'))
  return new Map(
    rows.map((r: { article_id: string; chunks_count: number }) => [r.article_id, Number(r.chunks_count)])
  )
}

/** Totales globales de la KB (no dependen de los filtros del listado). */
export async function kbStats(): Promise<KbStats> {
  const row = await db
    .from('kb_articles')
    .select(
      db.raw('count(*)::int as total'),
      db.raw("count(*) filter (where status='published')::int as published"),
      db.raw("count(*) filter (where status='draft')::int as draft")
    )
    .first()
  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    draft: Number(row?.draft ?? 0),
  }
}

export function serializeKbArticle(article: KbArticle, chunksCount = 0): KbArticleDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    body: article.body,
    status: article.status,
    publishedAt: article.publishedAt?.toISO() ?? null,
    createdAt: article.createdAt.toISO()!,
    updatedAt: article.updatedAt.toISO()!,
    chunksCount,
    indexed: chunksCount > 0,
    indexedAt: article.indexedAt?.toISO() ?? null,
    indexingError: article.indexingError,
  }
}

/** Igual que el detalle pero sin el markdown completo (extracto + longitud). */
export function serializeKbArticleListItem(article: KbArticle, chunksCount = 0): KbArticleListItem {
  const { body, ...rest } = serializeKbArticle(article, chunksCount)
  return { ...rest, excerpt: buildExcerpt(body), bodyLength: body.length }
}
