/**
 * Biblioteca de contenidos mobile (F7) — espejo de web. Buscador, chips de
 * sección (scroll horizontal), destacados y todo el material con badge NUEVO.
 * Al abrir un item se registra la vista y se abre por Linking.
 */
import { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, FlatList, Linking, RefreshControl } from 'react-native'
import { contentTypeLabels, formatFileSize } from '@grootfolio/shared'
import type { ContentItem, ContentType } from '@grootfolio/shared'
import { useContentItems, useContentSections, useMarkContentViewed } from '@/lib/queries'
import { useTheme } from '@/theme/ThemeProvider'
import { Screen } from '@/components/ui/Screen'
import { EmptyState } from '@/components/ui/States'
import { ASSISTANT_SAFE_BOTTOM } from '@/components/assistant/tokens'

const TYPE_META: Record<ContentType, { color: string; icon: string; cta: string }> = {
  doc: { color: '#DC2626', icon: '▤', cta: 'Leer' },
  video: { color: '#8B5CF6', icon: '▷', cta: 'Ver' },
  image: { color: '#14B8A6', icon: '▣', cta: 'Ver' },
  link: { color: '#3B82F6', icon: '⇗', cta: 'Abrir' },
}
const ORANGE = '#F97316'

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

  const featured = items.filter((i) => i.pinned)
  const rest = items.filter((i) => !i.pinned)

  const meta = (it: ContentItem) => [contentTypeLabels[it.type], it.sizeBytes ? formatFileSize(it.sizeBytes) : null].filter(Boolean).join(' · ')

  return (
    <Screen>
      <FlatList
        data={rest}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: ASSISTANT_SAFE_BOTTOM }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.brand.solid} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View>
              <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '800' }}>Contenidos</Text>
              <Text style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }}>Material educativo del equipo de GrootFolio.</Text>
            </View>
            <TextInput
              testID="content-search"
              placeholder="Buscar contenido…"
              placeholderTextColor={theme.text.placeholder}
              value={search}
              onChangeText={setSearch}
              style={{ height: 44, borderRadius: 10, backgroundColor: theme.background.muted, color: theme.text.primary, paddingHorizontal: 12 }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="Todos" active={!sectionId} onPress={() => setSectionId(undefined)} />
              {sections.map((s) => <Chip key={s.id} label={s.name} active={sectionId === s.id} onPress={() => setSectionId(s.id)} />)}
            </ScrollView>

            {featured.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>DESTACADOS</Text>
                {featured.map((it) => (
                  <TouchableOpacity key={it.id} onPress={() => open(it)} style={{ flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(249,115,22,0.26)', backgroundColor: 'rgba(249,115,22,0.06)', padding: 14 }}>
                    <TypeBadge type={it.type} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text.primary, fontWeight: '700' }} numberOfLines={1}>★ {it.title}</Text>
                      {it.description ? <Text style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }} numberOfLines={2}>{it.description}</Text> : null}
                      <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 4 }}>{meta(it)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {rest.length > 0 && <Text style={{ color: theme.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 }}>TODO EL MATERIAL</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => open(item)} style={{ flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 14 }}>
            <TypeBadge type={item.type} size={44} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '700', flex: 1 }} numberOfLines={1}>{item.title}</Text>
                {item.isNew && <Text style={{ color: '#fff', backgroundColor: ORANGE, fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' }}>NUEVO</Text>}
              </View>
              {item.description ? <Text style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }} numberOfLines={2}>{item.description}</Text> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: theme.text.muted, fontSize: 11 }}>{meta(item)}</Text>
                <Text style={{ color: ORANGE, fontWeight: '700', fontSize: 13 }}>{TYPE_META[item.type].cta} →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? <EmptyState title="Sin material todavía" description="Cuando el equipo publique contenido, va a aparecer acá." /> : null
        }
      />
    </Screen>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: active ? ORANGE : theme.border.default, backgroundColor: active ? 'rgba(249,115,22,0.1)' : 'transparent' }}>
      <Text style={{ color: active ? ORANGE : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  )
}

function TypeBadge({ type, size }: { type: ContentType; size: number }) {
  const m = TYPE_META[type]
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: `${m.color}22`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: m.color, fontSize: size * 0.4, fontWeight: '800' }}>{m.icon}</Text>
    </View>
  )
}
