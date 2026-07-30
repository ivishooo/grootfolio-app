/**
 * Panel de admin · Gestión de contenidos (F5). Secciones, tabla de todo el
 * contenido (incluye borradores) y los modales Subir contenido (con barra de
 * progreso real) y Nueva sección.
 */
import { useMemo, useState } from 'react'
import { contentTypeLabels, formatFileSize } from '@grootfolio/shared'
import type { ContentItem, ContentSection, ContentType } from '@grootfolio/shared'
import {
  useAdminContentItems,
  useContentSections,
  useCreateSection,
  useDeleteContent,
  useDeleteSection,
  usePinContent,
  usePublishContent,
  useUploadContent,
} from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'

const VIOLET = '#8B5CF6'
const GREEN = '#16A34A'
const AMBER = '#D97706'

const TYPE_META: Record<ContentType, { color: string; icon: string }> = {
  doc: { color: '#DC2626', icon: '▤' },
  video: { color: '#8B5CF6', icon: '▷' },
  image: { color: '#14B8A6', icon: '▣' },
  link: { color: '#3B82F6', icon: '⇗' },
}

const inputCls =
  'h-[42px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

export function AdminContentPage() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const { data: sections = [] } = useContentSections()
  const { data: items = [], isLoading } = useAdminContentItems()
  const pin = usePinContent()
  const del = useDeleteContent()
  const [showUpload, setShowUpload] = useState(false)
  const [showSection, setShowSection] = useState(false)

  const countBySection = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of items) m.set(it.sectionId, (m.get(it.sectionId) ?? 0) + 1)
    return m
  }, [items])

  const handleDelete = (item: ContentItem) => {
    void confirm({
      title: 'Eliminar contenido',
      message: `¿Eliminar "${item.title}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try { await del.mutateAsync(item.id); toast('Contenido eliminado', 'info') }
        catch (e) { toast(e instanceof Error ? e.message : 'No se pudo eliminar.', 'error'); throw e }
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">Gestión de contenidos</h2>
        <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: VIOLET, background: 'rgba(139,92,246,0.14)' }}>Solo admin</span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowSection(true)}>＋ Nueva sección</Button>
          <Button size="sm" onClick={() => setShowUpload(true)}>↑ Subir contenido</Button>
        </div>
      </div>

      {/* Secciones */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Secciones</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => <SectionCard key={s.id} section={s} count={countBySection.get(s.id) ?? 0} />)}
        </div>
      </div>

      {/* Tabla de contenido */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Todo el contenido</p>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full table-auto text-sm">
            <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-800/50">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Contenido</th>
                <th className="px-3 py-3 text-left font-medium">Sección</th>
                <th className="px-3 py-3 text-left font-medium">Estado</th>
                <th className="px-3 py-3 text-left font-medium">Publicado</th>
                <th className="px-3 py-3 text-right font-medium">Vistas</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-neutral-400">Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8"><EmptyState title="Sin contenido" description="Subí tu primer documento, video, imagen o enlace." /></td></tr>
              ) : (
                items.map((it) => {
                  const meta = TYPE_META[it.type]
                  return (
                    <tr key={it.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold" style={{ color: meta.color, background: `${meta.color}22` }}>{meta.icon}</span>
                          <div className="min-w-0">
                            <div className="font-semibold">{it.pinned && <span style={{ color: '#F97316' }}>★ </span>}{it.title}</div>
                            <div className="text-xs text-neutral-400">{contentTypeLabels[it.type]}{it.sizeBytes ? ` · ${formatFileSize(it.sizeBytes)}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-neutral-500">{it.sectionName}</td>
                      <td className="px-3 py-3">
                        {it.status === 'published' ? (
                          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: GREEN, background: `${GREEN}22` }}>Publicado</span>
                        ) : (
                          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: AMBER, background: `${AMBER}22` }}>Borrador</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-neutral-500">{formatDate(it.publishedAt)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{it.viewsCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5">
                          {it.status === 'draft' && (
                            <PublishButton item={it} />
                          )}
                          <button className="rounded-md px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: '#F97316' }} onClick={() => pin.mutate({ id: it.id, pinned: !it.pinned })}>
                            {it.pinned ? 'Quitar ★' : 'Destacar'}
                          </button>
                          <button className="rounded-md px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: '#DC2626' }} onClick={() => handleDelete(it)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && <UploadModal sections={sections} onClose={() => setShowUpload(false)} />}
      {showSection && <SectionModal onClose={() => setShowSection(false)} />}
    </div>
  )
}

function PublishButton({ item }: { item: ContentItem }) {
  const { toast } = useToast()
  const publish = usePublishContent()
  return (
    <button className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: GREEN }}
      onClick={() => publish.mutate({ id: item.id, notifyUsers: true }, { onSuccess: () => toast('Publicado y notificado', 'success') })} disabled={publish.isPending}>
      Publicar
    </button>
  )
}

function SectionCard({ section, count }: { section: ContentSection; count: number }) {
  const del = useDeleteSection()
  const { toast } = useToast()
  const confirm = useConfirm()
  const color = section.color ?? VIOLET
  const remove = () => {
    void confirm({
      title: 'Eliminar sección',
      message: count > 0 ? `"${section.name}" tiene ${count} elemento(s). Se moverán a otra sección (o se borran si es la única).` : `¿Eliminar la sección "${section.name}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try { await del.mutateAsync({ id: section.id, force: count > 0 }); toast('Sección eliminada', 'info') }
        catch (e) { toast(e instanceof Error ? e.message : 'No se pudo eliminar.', 'error'); throw e }
      },
    })
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg text-base" style={{ color, background: `${color}22` }}>{section.icon ?? '▤'}</span>
        <button className="text-neutral-400 hover:text-danger-500" onClick={remove} aria-label="Eliminar sección">⋯</button>
      </div>
      <div className="mt-2.5 font-semibold">{section.name}</div>
      <div className="text-xs text-neutral-400">{count} elemento{count === 1 ? '' : 's'}</div>
    </div>
  )
}

// ---------- Modales ----------

function ModalShell({ title, onClose, children, maxWidth = 520 }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-800" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  )
}

const TYPE_ORDER: ContentType[] = ['doc', 'video', 'image', 'link']

function UploadModal({ sections, onClose }: { sections: ContentSection[]; onClose: () => void }) {
  const { toast } = useToast()
  const upload = useUploadContent()
  const [type, setType] = useState<ContentType>('doc')
  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [notifyUsers, setNotifyUsers] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const submit = (publish: boolean) => {
    if (title.trim().length < 2) { setError('Poné un título (mínimo 2 caracteres).'); return }
    if (!sectionId) { setError('Elegí una sección.'); return }
    if (type === 'link' && !externalUrl.trim()) { setError('Indicá la URL del enlace.'); return }
    if (type !== 'link' && !file) { setError('Adjuntá el archivo.'); return }
    setError(null)
    setProgress(0)
    upload.mutate(
      { type, title: title.trim(), sectionId, description: description.trim() || undefined, externalUrl: externalUrl.trim() || undefined, file, publish, notifyUsers, onProgress: setProgress },
      {
        onSuccess: () => { toast(publish ? 'Contenido publicado' : 'Borrador guardado', 'success'); onClose() },
        onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo subir.'),
      }
    )
  }

  return (
    <ModalShell title="Subir contenido" onClose={onClose}>
      <p className="mb-1.5 text-sm font-medium">Tipo</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TYPE_ORDER.map((t) => {
          const m = TYPE_META[t]
          const sel = type === t
          return (
            <button key={t} type="button" onClick={() => setType(t)} className="flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] p-3 transition-colors"
              style={sel ? { borderColor: m.color, background: `${m.color}14` } : { borderColor: 'rgb(212 212 216 / 1)' }}>
              <span className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold" style={{ color: m.color, background: `${m.color}22` }}>{m.icon}</span>
              <span className="text-xs font-semibold">{contentTypeLabels[t]}</span>
            </button>
          )
        })}
      </div>

      <p className="mb-1.5 mt-4 text-sm font-medium">Título</p>
      <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Guía de primeros pasos" />

      <p className="mb-1.5 mt-4 text-sm font-medium">Sección</p>
      <select className={inputCls} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
        {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {type === 'link' ? (
        <>
          <p className="mb-1.5 mt-4 text-sm font-medium">URL</p>
          <input className={inputCls} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
        </>
      ) : (
        <>
          <p className="mb-1.5 mt-4 text-sm font-medium">Archivo</p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 hover:border-brand-500 dark:border-neutral-700">
            <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? <span className="font-medium text-neutral-700 dark:text-neutral-200">{file.name} · {formatFileSize(file.size)}</span> : <span>Hacé clic para elegir un archivo</span>}
          </label>
        </>
      )}

      <p className="mb-1.5 mt-4 text-sm font-medium">Descripción</p>
      <textarea className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

      <label className="mt-4 flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm" style={{ background: 'rgba(249,115,22,0.08)' }}>
        <input type="checkbox" className="mt-0.5" checked={notifyUsers} onChange={(e) => setNotifyUsers(e.target.checked)} />
        <span><span className="font-medium">Notificar a los usuarios</span><br /><span className="text-xs text-neutral-500">Reciben la notificación en la campanita y push en mobile.</span></span>
      </label>

      {upload.isPending && (
        <div className="mt-4">
          <div className="mb-1 text-xs text-neutral-500">Subiendo… {progress}%</div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-medium text-danger-500">{error}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={upload.isPending}>Cancelar</Button>
        <Button variant="secondary" onClick={() => submit(false)} disabled={upload.isPending}>Guardar borrador</Button>
        <Button onClick={() => submit(true)} disabled={upload.isPending}>{upload.isPending ? 'Subiendo…' : 'Publicar'}</Button>
      </div>
    </ModalShell>
  )
}

function SectionModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const create = useCreateSection()
  const [name, setName] = useState('')
  const submit = () => {
    if (name.trim().length < 2) { toast('Poné un nombre (mínimo 2 caracteres).', 'error'); return }
    create.mutate({ name: name.trim() }, {
      onSuccess: () => { toast('Sección creada', 'success'); onClose() },
      onError: (e) => toast(e instanceof Error ? e.message : 'No se pudo crear.', 'error'),
    })
  }
  return (
    <ModalShell title="Nueva sección" onClose={onClose} maxWidth={420}>
      <p className="mb-1.5 text-sm font-medium">Nombre</p>
      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Impuestos" autoFocus />
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
        <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Creando…' : 'Crear sección'}</Button>
      </div>
    </ModalShell>
  )
}
