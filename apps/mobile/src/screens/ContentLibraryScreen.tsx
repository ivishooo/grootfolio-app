/**
 * Aprender en mobile (rediseño v2, Fase 5; antes «Contenidos»). Espejo de la
 * web: buscador de 44, chips de sección en tinta invertida y tarjetas en una
 * columna. Destacados con fondo brand.tint; «NUEVO» en brand.subtle +
 * brand.ink. Abrir un material registra la vista y lo abre en el navegador.
 */
import { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, FlatList, Linking, RefreshControl } from 'react-native'
import { contentTypeLabels, formatFileSize } from '@grootfolio/shared'
import type { ContentItem, ContentType } from '@grootfolio/shared'
import { useContentItems, useContentSections, useMarkContentViewed } from '@/lib/queries'
import { useTheme } from '@/theme/ThemeProvider'
import { Screen } from '@/components/ui/Screen'
import { EmptyState } from '@/components/ui/States'

/** Padding inferior del SPEC: es el lugar de Groot sobre las tabs. */
const GROOT_SPACE = 150

const TYPE_META: Record<ContentType, { color: string; soft: string; icon: string; cta: string }> = {
  doc: { color: '#DC2626', soft: 'rgba(220,38,38,0.12)', icon: '▤', cta: 'Leer' },
  video: { color: '#8B5CF6', soft: 'rgba(139,92,246,0.12)', icon: '▷', cta: 'Ver' },
  image: { color: '#14B8A6', soft: 'rgba(20,184,166,0.12)', icon: '▣', cta: 'Ver' },
  link: { color: '#3B82F6', soft: 'rgba(59,130,246,0.12)', icon: '⇗', cta: 'Abrir' },
}

function meta(item: ContentItem): string {
  const parts = [contentTypeLabels[item.type]]
  if (item.durationSeconds) parts.push(`${Math.max(1, Math.round(item.durationSeconds / 60))} min`)
  else if (item.sizeBytes) parts.push(formatFileSize(item.sizeBytes))
  return parts.join(' · ')
}

export function ContentLibraryScreen() {
  const { theme } = useTheme()
  const [search, setSearch] = useState('')
  const [sectionId, setSectionId] = useState<string | undefined>(undefined)
  const { data: sections = [] } = useContentSections()
  const { data: items = [], isLoading, refetch, isRefetching } = useContentItems({ sectionId, search: search.trim() || undefined })
  const markViewed = useMarkContentViewed()

  const open = (item: ContentItem) => {
    markViewed.mutate(item.id)
    if (item.url) Linking.openURL(item.url).catch(() => {})
  }

  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  const nuevos = items.filter((i) => i.isNew).length
  const hasFilters = search.trim() !== '' || sectionId !== undefined

  const chip = (key: string, label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        borderColor: active ? theme.text.primary : theme.border.default,
        backgroundColor: active ? theme.text.primary : theme.background.surface,
      }}
    >
      <Text style={{ color: active ? theme.background.surface : theme.text.primary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <Screen>
      <FlatList
        data={sorted}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, gap: 12, paddingBottom: GROOT_SPACE }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.brand.solid} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 2 }}>
            <View>
              <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>Aprender</Text>
              <Text style={{ color: theme.text.secondary, fontSize: 13.5, marginTop: 2 }}>
                Material del equipo de GrootFolio.
                {nuevos > 0 ? ` ${nuevos} ${nuevos === 1 ? 'nuevo' : 'nuevos'} desde tu última visita.` : ''}
              </Text>
            </View>
            <TextInput
              testID="content-search"
              accessibilityLabel="Buscar material"
              placeholder="Buscar material…"
              placeholderTextColor={theme.text.placeholder}
              value={search}
              onChangeText={setSearch}
              style={{
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border.strong,
                backgroundColor: theme.background.surface,
                color: theme.text.primary,
                paddingHorizontal: 14,
                fontSize: 15,
              }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {chip('todo', 'Todo', !sectionId, () => setSectionId(undefined))}
              {sections.map((s) => chip(s.id, s.name, sectionId === s.id, () => setSectionId(s.id)))}
            </ScrollView>
            {isLoading && <Text style={{ color: theme.text.muted }}>Cargando…</Text>}
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : hasFilters ? (
            <View style={{ gap: 12 }}>
              <EmptyState
                title="No encontramos nada con ese filtro"
                description={search.trim() ? `Ningún material coincide con “${search.trim()}”.` : 'Esta sección todavía no tiene material.'}
              />
              <TouchableOpacity
                onPress={() => {
                  setSearch('')
                  setSectionId(undefined)
                }}
                style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: theme.brand.ink, fontWeight: '600' }}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState title="Sin material todavía" description="Cuando el equipo publique contenido, va a aparecer acá." />
          )
        }
        renderItem={({ item }) => {
          const m = TYPE_META[item.type]
          return (
            <TouchableOpacity
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityHint={`${m.cta} en el navegador`}
              style={{
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: item.pinned ? 'rgba(249,115,22,0.35)' : theme.border.default,
                backgroundColor: item.pinned ? theme.brand.tint : theme.background.surface,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: m.soft }}>
                <Text style={{ color: m.color, fontSize: 16, fontWeight: '700' }}>{m.icon}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Text style={{ color: theme.text.muted, fontSize: 12 }}>{meta(item)}</Text>
                {item.isNew && (
                  <Text style={{ color: theme.brand.ink, backgroundColor: theme.brand.subtle, fontSize: 10.5, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>
                    NUEVO
                  </Text>
                )}
              </View>
              <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginTop: 4 }}>{item.title}</Text>
              {item.description ? (
                <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }}>{item.description}</Text>
              ) : null}
              <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '600', marginTop: 12 }}>{m.cta} →</Text>
            </TouchableOpacity>
          )
        }}
      />
    </Screen>
  )
}
