/**
 * Ingesta de la KB (F3, ADR-0004): convierte artículos markdown en fragmentos
 * vectorizados listos para la búsqueda por similitud.
 *
 * Dos criterios de diseño:
 *
 * 1. **Las llamadas a Gemini quedan fuera de la transacción.** Son lentas y de
 *    red; mantenerlas afuera evita tener una transacción abierta segundos.
 * 2. **Si la indexación falla, los chunks viejos se conservan.** Es preferible
 *    que el bot siga respondiendo con la versión anterior del artículo a que
 *    quede sin ninguna. El error se guarda en `indexing_error` para que el
 *    panel lo muestre.
 */
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import KbArticle from '#models/kb_article'
import { chunkMarkdown } from '#services/kb/chunker'
import {
  AiUnavailableError,
  describeError,
  embedTexts,
  isAiEnabled,
  withRetry,
} from '#services/kb/gemini_client'

/** Textos por llamada a la API de embeddings. */
const EMBED_BATCH_SIZE = 50

export interface IngestResult {
  articleId: string
  chunks: number
  skipped?: 'not_published' | 'empty_body'
}

/** Borra los fragmentos indexados de un artículo (al despublicar o borrar). */
export async function clearArticleIndex(articleId: string): Promise<void> {
  await db.from('kb_chunks').where('article_id', articleId).delete()
}

/**
 * Reindexa un artículo: chunking + embeddings + reemplazo de sus fragmentos.
 * Idempotente: correrlo dos veces sobre el mismo contenido deja el mismo
 * resultado. Sólo indexa artículos publicados; los borradores se limpian.
 */
export async function reindexArticle(article: KbArticle): Promise<IngestResult> {
  if (article.status !== 'published') {
    await clearArticleIndex(article.id)
    await markIndexed(article, 0, null)
    return { articleId: article.id, chunks: 0, skipped: 'not_published' }
  }

  if (!isAiEnabled()) throw new AiUnavailableError()

  const drafts = chunkMarkdown(article.body)
  if (drafts.length === 0) {
    await clearArticleIndex(article.id)
    await markIndexed(article, 0, null)
    return { articleId: article.id, chunks: 0, skipped: 'empty_body' }
  }

  // Se antepone el título y la sección al texto que se vectoriza: un fragmento
  // suelto ("tocá Agregar") pierde el tema del que habla, y con el encabezado
  // delante matchea mucho mejor la pregunta del usuario.
  const inputs = drafts.map((draft) =>
    [article.title, draft.heading, draft.content].filter(Boolean).join('\n\n')
  )

  let vectors: number[][]
  try {
    vectors = await embedAll(inputs)
  } catch (err) {
    const reason = describeError(err)
    await markIndexingError(article, reason)
    logger.error(`[kb] falló la indexación de "${article.title}": ${reason}`)
    throw err
  }

  await db.transaction(async (trx) => {
    await trx.from('kb_chunks').where('article_id', article.id).delete()
    await trx.table('kb_chunks').multiInsert(
      drafts.map((draft, index) => ({
        article_id: article.id,
        ord: draft.ord,
        content: draft.content,
        heading: draft.heading,
        token_count: draft.tokenCount,
        embedding: toVectorLiteral(vectors[index]),
      }))
    )
  })

  await markIndexed(article, drafts.length, null)
  return { articleId: article.id, chunks: drafts.length }
}

/** Embeddings de todos los fragmentos, en tandas y con reintentos. */
async function embedAll(inputs: string[]): Promise<number[][]> {
  const vectors: number[][] = []
  for (let i = 0; i < inputs.length; i += EMBED_BATCH_SIZE) {
    const batch = inputs.slice(i, i + EMBED_BATCH_SIZE)
    const embedded = await withRetry(() => embedTexts(batch, 'RETRIEVAL_DOCUMENT'), {
      onWait: (ms, attempt) =>
        logger.warn(`[kb] embeddings ${i + 1}-${i + batch.length}: reintento ${attempt} en ${ms}ms`),
    })
    vectors.push(...embedded)
  }
  return vectors
}

/** `number[]` → literal de pgvector (`[0.1,0.2,...]`). */
function toVectorLiteral(vector: number[] | undefined): string | null {
  return vector ? `[${vector.join(',')}]` : null
}

async function markIndexed(article: KbArticle, chunks: number, error: string | null): Promise<void> {
  article.indexedAt = chunks > 0 ? DateTime.now() : null
  article.indexingError = error
  await article.save()
}

async function markIndexingError(article: KbArticle, reason: string): Promise<void> {
  article.indexingError = reason.slice(0, 1000)
  await article.save()
}

/**
 * Reindexa todos los artículos publicados. Para la carga inicial, para
 * mantenimiento y para cuando se cambia de modelo de embeddings.
 * No corta ante el primer fallo: reporta el detalle al final.
 */
export async function reindexAll(): Promise<{
  ok: IngestResult[]
  failed: Array<{ articleId: string; title: string; reason: string }>
}> {
  const articles = await KbArticle.query().where('status', 'published').orderBy('created_at', 'asc')

  const ok: IngestResult[] = []
  const failed: Array<{ articleId: string; title: string; reason: string }> = []

  for (const article of articles) {
    try {
      ok.push(await reindexArticle(article))
    } catch (err) {
      failed.push({ articleId: article.id, title: article.title, reason: describeError(err) })
    }
  }

  return { ok, failed }
}
