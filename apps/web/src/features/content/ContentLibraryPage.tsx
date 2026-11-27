/**
 * Aprender (rediseño v2, Fase 5; antes «Contenidos»). SPEC-pantallas › Aprender.
 * Buscador de 44, chips de sección en tinta invertida y tarjetas en grilla
 * (3 columnas en web). Los destacados (`pinned`) van con fondo brand.tint y la
 * etiqueta «NUEVO» en brand.subtle + brand.ink. Al abrir un material se
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

/** «Video · 4 min», «Documento · 1,2 MB». */
function meta(item: ContentItem): string {
  const parts = [contentTypeLabels[item.type]]
  if (item.durationSeconds) parts.push(`${Math.max(1, Math.round(item.durationSeconds / 60))} min`)
  else if (item.sizeBytes) parts.push(formatFileSize(item.sizeBytes))
  return parts.join(' · ')
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

  // Destacados primero; el resto en el orden en que llega.
  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  const nuevos = items.filter((i) => i.isNew).length

  // "No hay material publicado" y "tu búsqueda no encontró nada" son dos cosas
  // distintas: con un filtro puesto hay que decirlo y ofrecer limpiarlo.
  const hasFilters = search.trim() !== '' || sectionId !== undefined
  const clearFilters = () => {
    setSearch('')
    setSectionId(undefined)
  }

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Aprender</h1>
        <p className="mt-1 text-sm text-ink-2">
          Material del equipo de GrootFolio.
          {nuevos > 0 && ` ${nuevos} ${nuevos === 1 ? 'nuevo' : 'nuevos'} desde tu última visita.`}
        </p>
      </div>

      <input
        type="search"
        aria-label="Buscar material"
        className="h-11 w-full rounded-[10px] border border-ctl bg-surface px-3.5 text-[15px] placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder="Buscar material…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Secciones">
        <Chip label="Todo" active={!sectionId} onClick={() => setSectionId(undefined)} />
        {sections.map((s) => (
          <Chip key={s.id} label={s.name} active={sectionId === s.id} onClick={() => setSectionId(s.id)} />
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No encontramos nada con ese filtro"
            description={search.trim() ? `Ningún material coincide con “${search.trim()}”.` : 'Esta sección todavía no tiene material.'}
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((it) => (
            <ItemCard key={it.id} item={it} onOpen={() => open(it)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-[34px] rounded-[20px] border px-3 text-[13px] font-semibold ${active ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:bg-muted'}`}
    >
      {label}
    </button>
  )
}

function ItemCard({ item, onOpen }: { item: ContentItem; onOpen: () => void }) {
  const m = TYPE_META[item.type]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex flex-col rounded-2xl border p-4 text-left transition-colors hover:border-brand-500 ${
        item.pinned ? 'bg-brand-tint' : 'border-line bg-surface'
      }`}
      style={item.pinned ? { borderColor: 'color-mix(in srgb, #F97316 35%, transparent)' } : undefined}
    >
      <span className="grid h-9 w-9 place-items-center rounded-[10px] text-base font-bold" style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 12%, transparent)` }} aria-hidden="true">
        {m.icon}
      </span>
      <span className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        {meta(item)}
        {item.isNew && <span className="rounded-md bg-brand-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-brand-ink">NUEVO</span>}
      </span>
      <span className="mt-1 text-[15px] font-semibold">{item.title}</span>
      {item.description && <span className="mt-0.5 line-clamp-2 flex-1 text-[13px] text-ink-2">{item.description}</span>}
      <span className="mt-3 text-[13px] font-semibold text-brand-ink">{m.cta} →</span>
    </button>
  )
}
