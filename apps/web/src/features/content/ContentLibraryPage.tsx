/**
 * Biblioteca de contenidos del usuario (F6, /content). Buscador + chips de
 * sección, destacados y todo el material con badge NUEVO. Al abrir un item se
 * registra la vista (saca el NUEVO y suma al contador).
 */
import { useState } from 'react'
import { contentTypeLabels, formatFileSize } from '@grootfolio/shared'
import type { ContentItem, ContentType } from '@grootfolio/shared'
import { useContentItems, useContentSections, useMarkContentViewed } from '@/lib/queries'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'

const TYPE_META: Record<ContentType, { color: string; icon: string; cta: string }> = {
  doc: { color: '#DC2626', icon: '▤', cta: 'Leer' },
  video: { color: '#8B5CF6', icon: '▷', cta: 'Ver' },
  image: { color: '#14B8A6', icon: '▣', cta: 'Ver' },
  link: { color: '#3B82F6', icon: '⇗', cta: 'Abrir' },
}

export function ContentLibraryPage() {
  const [search, setSearch] = useState('')
  const [sectionId, setSectionId] = useState<string | undefined>(undefined)
  const { data: sections = [] } = useContentSections()
  const { data: items = [], isLoading } = useContentItems({ sectionId, search: search.trim() || undefined })
  const markViewed = useMarkContentViewed()

  const open = (item: ContentItem) => {
    markViewed.mutate(item.id)
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  const featured = items.filter((i) => i.pinned)
  const rest = items.filter((i) => !i.pinned)

  // "No hay material publicado" y "tu busqueda no encontro nada" son dos cosas
  // distintas. Mostrar la primera cuando el usuario acaba de filtrar lo lleva a
  // pensar que la seccion esta vacia, sin pista de que hay un filtro puesto.
  const hasFilters = search.trim() !== '' || sectionId !== undefined
  const clearFilters = () => {
    setSearch('')
    setSectionId(undefined)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Contenidos</h2>
        <p className="mt-1 text-sm text-neutral-500">Material educativo del equipo de GrootFolio.</p>
      </div>

      <input
        className="h-[42px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
        placeholder="Buscar contenido…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Chip label="Todos" active={!sectionId} onClick={() => setSectionId(undefined)} />
        {sections.map((s) => (
          <Chip key={s.id} label={s.name} active={sectionId === s.id} onClick={() => setSectionId(s.id)} />
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Cargando…</p>
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No encontramos nada con ese filtro"
            description={
              search.trim()
                ? `Ningún material coincide con “${search.trim()}”.`
                : 'Esta categoría todavía no tiene material.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState title="Sin material todavía" description="Cuando el equipo publique contenido, va a aparecer acá." />
        )
      ) : (
        <>
          {featured.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Destacados</p>
              <div className="grid gap-3 md:grid-cols-2">
                {featured.map((it) => <FeaturedCard key={it.id} item={it} onOpen={() => open(it)} />)}
              </div>
            </section>
          )}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Todo el material</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((it) => <ItemCard key={it.id} item={it} onOpen={() => open(it)} />)}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
      style={active ? { borderColor: '#F97316', background: 'rgba(249,115,22,0.1)', color: '#F97316' } : { borderColor: 'rgb(212 212 216 / 1)' }}
    >
      {label}
    </button>
  )
}

function meta(item: ContentItem): string {
  const parts = [contentTypeLabels[item.type]]
  if (item.sizeBytes) parts.push(formatFileSize(item.sizeBytes))
  return parts.join(' · ')
}

function FeaturedCard({ item, onOpen }: { item: ContentItem; onOpen: () => void }) {
  const m = TYPE_META[item.type]
  return (
    <button
      onClick={onOpen}
      className="flex gap-3.5 rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5"
      style={{ borderColor: 'rgba(249,115,22,0.26)', background: 'rgba(249,115,22,0.05)' }}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold" style={{ color: m.color, background: `${m.color}22` }}>{m.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-semibold"><span style={{ color: '#F97316' }}>★</span>{item.title}</div>
        {item.description && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{item.description}</p>}
        <p className="mt-1.5 text-xs text-neutral-400">{meta(item)}</p>
      </div>
    </button>
  )
}

function ItemCard({ item, onOpen }: { item: ContentItem; onOpen: () => void }) {
  const m = TYPE_META[item.type]
  return (
    <div className="relative flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {item.isNew && (
        <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#F97316' }}>NUEVO</span>
      )}
      <span className="grid h-[38px] w-[38px] place-items-center rounded-xl text-base font-bold" style={{ color: m.color, background: `${m.color}22` }}>{m.icon}</span>
      <div className="mt-2.5 font-semibold">{item.title}</div>
      {item.description && <p className="mt-0.5 line-clamp-2 flex-1 text-sm text-neutral-500">{item.description}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <span className="text-xs text-neutral-400">{meta(item)}</span>
        <button onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#F97316' }}>
          {m.cta} →
        </button>
      </div>
    </div>
  )
}
