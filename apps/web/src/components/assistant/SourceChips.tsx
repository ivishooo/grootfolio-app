/**
 * Fuentes de una respuesta, como chips (rediseño, PR 2).
 *
 * Resuelve el problema 05 del diagnóstico: el bot prometía "no inventar" pero no
 * mostraba de dónde salía la respuesta. Cada chip abre el artículo en la Base de
 * conocimiento, así el usuario puede verificar.
 *
 * Los chips van **agrupados por artículo**: el retrieval devuelve fragmentos, y
 * con la base de conocimiento completa lo normal es que varios salgan del mismo
 * texto. Sin agrupar, cada chip llevaba el nombre de una sección distinta y la
 * fila entera se leía como un menú de sugerencias, no como una cita. Las
 * secciones siguen estando, en el tooltip.
 *
 * Si el bot **no** respondió con respaldo documental no se muestra nada:
 * enseñar fuentes debajo de un "no sé" es peor que no mostrar ninguna.
 */
import { Link } from 'react-router-dom'
import { groupSourcesByArticle } from '@grootfolio/shared'
import type { ChatMessage } from '@grootfolio/shared'

export function SourceChips({ message }: { message: ChatMessage }) {
  if (!message.grounded || message.sources.length === 0) return null

  const sources = groupSourcesByArticle(message.sources)

  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <Link
          key={source.articleId}
          to={`/content?kb=${source.slug}`}
          title={
            source.headings.length > 0
              ? `${source.title} › ${source.headings.join(' · ')}`
              : source.title
          }
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[color:var(--gf-border)] bg-[color:var(--gf-surface)] px-2.5 py-1 text-[11px] text-[color:var(--gf-ink-2)] transition-colors hover:border-[color:var(--gf-accent)] hover:text-[color:var(--gf-accent-ink)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="truncate">{source.title}</span>
          {source.headings.length > 1 && (
            <span className="shrink-0 text-[color:var(--gf-ink-3)]">· {source.headings.length}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
