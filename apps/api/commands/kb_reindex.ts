/**
 * Comando `kb:reindex` (F3, chatbot RAG). Reconstruye los fragmentos
 * vectorizados de la base de conocimiento. Se usa para la carga inicial, para
 * mantenimiento y cuando se cambia de modelo de embeddings (que invalida todos
 * los vectores existentes).
 *
 *   node ace kb:reindex                  # todos los artículos publicados
 *   node ace kb:reindex --slug=como-cargar-una-transaccion
 */
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class KbReindex extends BaseCommand {
  static commandName = 'kb:reindex'
  static description = 'Reindexa la base de conocimiento del chatbot (chunking + embeddings)'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Reindexar sólo el artículo con este slug' })
  declare slug?: string

  async run() {
    const { isAiEnabled } = await import('#services/kb/gemini_client')
    if (!isAiEnabled()) {
      this.logger.error('Falta GEMINI_API_KEY: no se puede indexar sin el proveedor de embeddings.')
      this.exitCode = 1
      return
    }

    const { reindexArticle, reindexAll } = await import('#services/kb/rag_ingest_service')

    if (this.slug) {
      const KbArticle = (await import('#models/kb_article')).default
      const article = await KbArticle.findBy('slug', this.slug)
      if (!article) {
        this.logger.error(`No existe un artículo con slug "${this.slug}".`)
        this.exitCode = 1
        return
      }
      const result = await reindexArticle(article)
      this.logger.info(`"${article.title}": ${result.chunks} fragmentos indexados.`)
      return
    }

    const { ok, failed } = await reindexAll()
    const chunks = ok.reduce((total, result) => total + result.chunks, 0)
    this.logger.info(`Artículos indexados: ${ok.length} · fragmentos: ${chunks}`)

    if (failed.length > 0) {
      this.logger.error(`Fallaron ${failed.length}:`)
      for (const failure of failed) this.logger.error(`  - ${failure.title}: ${failure.reason}`)
      this.exitCode = 1
    }
  }
}
