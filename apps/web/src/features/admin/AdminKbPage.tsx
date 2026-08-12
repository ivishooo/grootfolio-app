/**
 * Panel de admin · Base de conocimiento del chatbot (F5). Lista de artículos,
 * editor markdown con preview, publicar/despublicar y estado de indexación.
 *
 * El estado de indexación es lo que hace útil esta pantalla: un artículo puede
 * estar publicado pero sin vectorizar (si falló la llamada al proveedor de IA),
 * y en ese caso el bot no lo usa. Por eso se muestra el error y se explica cómo
 * reintentar.
 */
import { useMemo, useState } from 'react'
import type { KbArticle, KbArticleListItem } from '@grootfolio/shared'
import {
  useCreateKbArticle,
  useDeleteKbArticle,
  useKbArticle,
  useKbArticles,
  usePublishKbArticle,
  useUpdateKbArticle,
} from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { Markdown } from '@/components/ui/Markdown'

const inputCls =
  'h-[42px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

/** Semáforo de indexación: es lo que determina si el bot puede usar el artículo. */
function IndexBadge({ article }: { article: KbArticleListItem | KbArticle }) {
  if (article.indexingError) {
    return (
      <span
        title={article.indexingError}
        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400"
      >
        ● Error de indexación
      </span>
    )
  }
  if (article.status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
        ○ Borrador
      </span>
    )
  }
  if (!article.indexed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        ◐ Sin indexar
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
      ● Indexado · {article.chunksCount} frag.
    </span>
  )
}

export function AdminKbPage() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'draft' | 'published'>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const filters = useMemo(
    () => ({ ...(search ? { search } : {}), ...(status ? { status } : {}) }),
    [search, status]
  )
  const { data, isLoading } = useKbArticles(filters)
  const articles = data?.data ?? []
  const stats = data?.stats

  const publish = usePublishKbArticle()
  const del = useDeleteKbArticle()

  const handlePublish = async (article: KbArticleListItem) => {
    const toPublish = article.status === 'draft'
    try {
      const { article: updated } = await publish.mutateAsync({ id: article.id, publish: toPublish })
      if (!toPublish) {
        toast('Artículo despublicado. El bot dejó de usarlo.', 'success')
      } else if (updated.indexingError) {
        toast('Se publicó, pero falló la indexación. El bot todavía no puede usarlo.', 'error')
      } else {
        toast(`Publicado e indexado en ${updated.chunksCount} fragmentos.`, 'success')
      }
    } catch {
      toast('No se pudo cambiar el estado del artículo.', 'error')
    }
  }

  const handleDelete = async (article: KbArticleListItem) => {
    const ok = await confirm({
      title: 'Borrar artículo',
      message: `Se va a borrar "${article.title}" y el bot dejará de usarlo. Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar',
      danger: true,
    })
    if (!ok) return
    try {
      await del.mutateAsync(article.id)
      toast('Artículo borrado.', 'success')
    } catch {
      toast('No se pudo borrar el artículo.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Base de conocimiento</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Lo que el asistente puede responder. Sólo usa artículos publicados e indexados.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuevo artículo</Button>
      </header>

      {stats && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
            Total: <strong>{stats.total}</strong>
          </span>
          <span className="rounded-lg bg-green-50 px-3 py-1.5 text-green-700 dark:bg-green-500/10 dark:text-green-400">
            Publicados: <strong>{stats.published}</strong>
          </span>
          <span className="rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
            Borradores: <strong>{stats.draft}</strong>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          className={`${inputCls} sm:max-w-xs`}
          placeholder="Buscar por título o contenido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${inputCls} sm:max-w-[180px]`}
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | 'draft' | 'published')}
        >
          <option value="">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-500">Cargando…</p>
      ) : articles.length === 0 ? (
        <EmptyState
          title="No hay artículos"
          description="El asistente no puede responder nada hasta que cargues al menos un artículo publicado."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Publicado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {articles.map((article) => (
                <tr key={article.id} className="align-top">
                  <td className="px-4 py-3">
                    <button
                      className="text-left font-medium hover:text-brand-600 dark:hover:text-brand-400"
                      onClick={() => setEditingId(article.id)}
                    >
                      {article.title}
                    </button>
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {article.excerpt}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <IndexBadge article={article} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatDate(article.publishedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditingId(article.id)}>
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={publish.isPending}
                        onClick={() => void handlePublish(article)}
                      >
                        {article.status === 'draft' ? 'Publicar' : 'Despublicar'}
                      </Button>
                      <Button variant="destructive" onClick={() => void handleDelete(article)}>
                        Borrar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editingId) && (
        <ArticleEditor
          articleId={editingId}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

/** Editor de artículo: alta o edición, con preview del markdown al lado. */
function ArticleEditor({ articleId, onClose }: { articleId: string | null; onClose: () => void }) {
  const { toast } = useToast()
  const { data: existing, isLoading } = useKbArticle(articleId)
  const create = useCreateKbArticle()
  const update = useUpdateKbArticle()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [publish, setPublish] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Se rellena una sola vez cuando llega el detalle (el listado no trae el body).
  if (existing && !loaded) {
    setTitle(existing.title)
    setBody(existing.body)
    setLoaded(true)
  }

  const saving = create.isPending || update.isPending
  const canSave = title.trim().length >= 3 && body.trim().length >= 20 && !saving

  const handleSave = async () => {
    try {
      if (articleId) {
        await update.mutateAsync({ id: articleId, title: title.trim(), body: body.trim() })
        toast('Artículo actualizado.', 'success')
      } else {
        const { article } = await create.mutateAsync({ title: title.trim(), body: body.trim(), publish })
        toast(
          article.indexingError
            ? 'Se creó, pero falló la indexación. Revisá el estado en la lista.'
            : publish
              ? `Publicado e indexado en ${article.chunksCount} fragmentos.`
              : 'Borrador guardado.',
          article.indexingError ? 'error' : 'success'
        )
      }
      onClose()
    } catch {
      toast('No se pudo guardar el artículo.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="font-semibold">{articleId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600" aria-label="Cerrar">
            ✕
          </button>
        </header>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-neutral-500">Cargando…</p>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="kb-title">
                Título
              </label>
              <input
                id="kb-title"
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cómo cargar una transacción"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="kb-body">
                  Contenido (markdown)
                </label>
                <textarea
                  id="kb-body"
                  className="h-72 w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={'## Una sección\n\nEl texto de la sección.\n\n## Otra sección\n\nMás texto.'}
                />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Los encabezados <code>##</code> definen los fragmentos que el bot recupera y cita.
                  Conviene una idea por sección.
                </p>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium">Vista previa</span>
                <div className="h-72 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  {body.trim() ? (
                    <Markdown source={body} />
                  ) : (
                    <p className="text-sm text-neutral-400">Escribí algo para ver la vista previa.</p>
                  )}
                </div>
              </div>
            </div>

            {!articleId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
                Publicar ahora (se indexa al guardar y puede tardar unos segundos)
              </label>
            )}
          </div>
        )}

        <footer className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSave} onClick={() => void handleSave()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
