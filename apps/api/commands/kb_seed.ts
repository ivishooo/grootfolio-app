/**
 * Comando `kb:seed` (chatbot RAG). Carga en la base los artículos de la base de
 * conocimiento versionados en `database/kb/*.md`.
 *
 * La KB es contenido, pero es contenido del que depende el bot: si vive sólo en
 * la base de datos, no se puede revisar en un PR, no se puede reproducir la
 * evaluación y cada entorno termina con una KB distinta. Por eso los artículos
 * son archivos markdown del repo y este comando los sincroniza.
 *
 * Cada archivo lleva un frontmatter mínimo:
 *
 *   ---
 *   title: Cargar, editar y borrar transacciones
 *   slug: como-cargar-una-transaccion
 *   status: published
 *   ---
 *
 * El upsert es por `slug`. No borra artículos que existan sólo en la base: la
 * KB del repo es la fuente de la verdad del contenido del equipo, pero un admin
 * puede haber cargado algo desde el panel y no es tarea de un seed borrarlo.
 *
 *   node ace kb:seed                 # sincroniza el contenido (sin indexar)
 *   node ace kb:seed --index         # además reindexa lo publicado que cambió
 *   node ace kb:seed --index --force # reindexa todo lo publicado, cambie o no
 *   node ace kb:seed --slug=que-es-un-bono
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

interface ParsedArticle {
  file: string
  title: string
  slug: string
  status: 'draft' | 'published'
  body: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** Frontmatter plano `clave: valor`. No hace falta YAML completo ni la dependencia. */
function parseArticle(file: string, raw: string): ParsedArticle {
  const match = raw.match(FRONTMATTER)
  if (!match) throw new Error(`${file}: falta el frontmatter`)

  const meta: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }

  const { title, slug, status = 'published' } = meta
  if (!title) throw new Error(`${file}: falta "title" en el frontmatter`)
  if (!slug) throw new Error(`${file}: falta "slug" en el frontmatter`)
  if (status !== 'draft' && status !== 'published') {
    throw new Error(`${file}: "status" debe ser draft o published, no "${status}"`)
  }

  const body = raw.slice(match[0].length).trim()
  if (!body) throw new Error(`${file}: el artículo no tiene cuerpo`)

  return { file, title, slug, status, body }
}

export default class KbSeed extends BaseCommand {
  static commandName = 'kb:seed'
  static description = 'Carga los artículos de database/kb/*.md en la base de conocimiento'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Reindexar (chunking + embeddings) lo publicado que cambió' })
  declare index?: boolean

  @flags.boolean({ description: 'Con --index, reindexa todo lo publicado aunque no haya cambiado' })
  declare force?: boolean

  @flags.string({ description: 'Sincronizar sólo el artículo con este slug' })
  declare slug?: string

  async run() {
    const KbArticle = (await import('#models/kb_article')).default
    const dir = this.app.makePath('database/kb')

    let files: string[]
    try {
      // El README de la carpeta documenta cómo escribir artículos: es markdown
      // sin frontmatter y no es contenido de la KB.
      files = (await readdir(dir))
        .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
        .sort()
    } catch {
      this.logger.error(`No se pudo leer ${dir}`)
      this.exitCode = 1
      return
    }

    const articles: ParsedArticle[] = []
    for (const file of files) {
      try {
        articles.push(parseArticle(file, await readFile(join(dir, file), 'utf8')))
      } catch (error) {
        this.logger.error(error instanceof Error ? error.message : String(error))
        this.exitCode = 1
        return
      }
    }

    const duplicated = articles
      .map((a) => a.slug)
      .filter((slug, i, all) => all.indexOf(slug) !== i)
    if (duplicated.length > 0) {
      this.logger.error(`Slugs repetidos en database/kb: ${[...new Set(duplicated)].join(', ')}`)
      this.exitCode = 1
      return
    }

    const selected = this.slug ? articles.filter((a) => a.slug === this.slug) : articles
    if (selected.length === 0) {
      this.logger.error(`No hay ningún artículo con slug "${this.slug}" en database/kb.`)
      this.exitCode = 1
      return
    }

    /** Publicados cuyo contenido cambió: son los que hay que reindexar. */
    const stale: InstanceType<typeof KbArticle>[] = []
    let created = 0
    let updated = 0
    let unchanged = 0

    for (const parsed of selected) {
      const existing = await KbArticle.findBy('slug', parsed.slug)

      if (!existing) {
        const article = await KbArticle.create({
          title: parsed.title,
          slug: parsed.slug,
          body: parsed.body,
          status: parsed.status,
          publishedAt: parsed.status === 'published' ? DateTime.now() : null,
        })
        created++
        if (article.status === 'published') stale.push(article)
        continue
      }

      const changed =
        existing.title !== parsed.title ||
        existing.body !== parsed.body ||
        existing.status !== parsed.status

      if (!changed) {
        unchanged++
        // Publicado pero nunca indexado (o con el índice fallado): igual entra.
        if (existing.status === 'published' && (this.force || !existing.indexedAt)) {
          stale.push(existing)
        }
        continue
      }

      const contentChanged = existing.title !== parsed.title || existing.body !== parsed.body
      existing.title = parsed.title
      existing.body = parsed.body
      existing.status = parsed.status
      if (parsed.status === 'published' && !existing.publishedAt) {
        existing.publishedAt = DateTime.now()
      }
      // El índice describe el contenido anterior: dejar de declararlo indexado.
      // Si no, un `kb:seed` sin --index deja el artículo con `indexed_at` viejo
      // y la corrida siguiente lo saltea por "sin cambios", con los embeddings
      // apuntando a un texto que ya no existe.
      if (contentChanged) existing.indexedAt = null
      await existing.save()
      updated++

      if (existing.status === 'published' && (contentChanged || this.force || !existing.indexedAt)) {
        stale.push(existing)
      }
    }

    this.logger.info(
      `Artículos: ${created} nuevos · ${updated} actualizados · ${unchanged} sin cambios`
    )

    if (!this.index) {
      if (stale.length > 0) {
        this.logger.info(`Pendientes de indexar: ${stale.length}. Corré "node ace kb:seed --index".`)
      }
      return
    }

    const { isAiEnabled } = await import('#services/kb/gemini_client')
    if (!isAiEnabled()) {
      this.logger.error('Falta GEMINI_API_KEY: el contenido quedó cargado pero sin indexar.')
      this.exitCode = 1
      return
    }

    if (stale.length === 0) {
      this.logger.info('No hay nada para reindexar.')
      return
    }

    const { reindexArticle } = await import('#services/kb/rag_ingest_service')
    let chunks = 0
    const failed: string[] = []

    for (const article of stale) {
      try {
        const result = await reindexArticle(article)
        chunks += result.chunks
        this.logger.info(`  ${article.slug}: ${result.chunks} fragmentos`)
      } catch (error) {
        failed.push(`${article.slug}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    this.logger.info(`Indexados: ${stale.length - failed.length} artículos · ${chunks} fragmentos`)
    if (failed.length > 0) {
      this.logger.error(`Fallaron ${failed.length}:`)
      for (const reason of failed) this.logger.error(`  - ${reason}`)
      this.exitCode = 1
    }
  }
}
