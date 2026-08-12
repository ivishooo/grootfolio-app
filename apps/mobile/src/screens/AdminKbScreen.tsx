/**
 * Admin · Base de conocimiento en mobile (F6).
 *
 * **Alcance deliberadamente menor que en web**: acá se lista, se consulta el
 * estado de indexación, se publica/despublica y se borra. La redacción del
 * markdown queda en el panel web — escribir artículos largos en un teléfono es
 * incómodo, y un editor a medias invita a cargar contenido pobre, que es
 * justamente lo que degrada al bot.
 *
 * El estado de indexación es lo que importa mirar acá: un artículo publicado
 * pero sin vectorizar no lo usa el asistente.
 */
import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { KbArticleListItem } from '@grootfolio/shared'
import {
  useDeleteKbArticle,
  useKbArticle,
  useKbArticles,
  usePublishKbArticle,
} from '@/lib/queries'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Screen } from '@/components/ui/Screen'
import { EmptyState } from '@/components/ui/States'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Markdown } from '@/components/ui/Markdown'

const GREEN = '#16A34A'
const AMBER = '#D97706'
const RED = '#DC2626'

type StatusFilter = '' | 'draft' | 'published'

function indexState(article: KbArticleListItem): { label: string; color: string } {
  if (article.indexingError) return { label: '● Error de indexación', color: RED }
  if (article.status === 'draft') return { label: '○ Borrador', color: '#6B7280' }
  if (!article.indexed) return { label: '◐ Sin indexar', color: AMBER }
  return { label: `● Indexado · ${article.chunksCount} frag.`, color: GREEN }
}

export function AdminKbScreen() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [preview, setPreview] = useState<KbArticleListItem | null>(null)

  const filters = { ...(search ? { search } : {}), ...(status ? { status } : {}) }
  const { data, isLoading, refetch, isRefetching } = useKbArticles(filters)
  const articles = data?.data ?? []
  const stats = data?.stats

  const publish = usePublishKbArticle()
  const del = useDeleteKbArticle()

  const handlePublish = async (article: KbArticleListItem) => {
    const toPublish = article.status === 'draft'
    try {
      const { article: updated } = await publish.mutateAsync({ id: article.id, publish: toPublish })
      if (!toPublish) toast('Artículo despublicado. El bot dejó de usarlo.', 'success')
      else if (updated.indexingError)
        toast('Se publicó, pero falló la indexación. El bot todavía no puede usarlo.', 'error')
      else toast(`Publicado e indexado en ${updated.chunksCount} fragmentos.`, 'success')
    } catch {
      toast('No se pudo cambiar el estado del artículo.', 'error')
    }
  }

  const handleDelete = async (article: KbArticleListItem) => {
    const ok = await confirm({
      title: 'Borrar artículo',
      message: `Se va a borrar "${article.title}" y el bot dejará de usarlo.`,
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

  const filterChip = (value: StatusFilter, label: string) => {
    const active = status === value
    return (
      <TouchableOpacity
        key={value || 'all'}
        onPress={() => setStatus(value)}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.brand.solid : theme.background.muted,
            borderColor: active ? theme.brand.solid : theme.border.default,
          },
        ]}
      >
        <Text style={{ color: active ? '#fff' : theme.text.secondary, fontSize: 13 }}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <Screen>
      <Text style={[styles.hint, { color: theme.text.muted }]}>
        El asistente sólo usa artículos publicados e indexados. Los artículos se redactan desde el
        panel web.
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por título o contenido…"
        placeholderTextColor={theme.text.muted}
        style={[
          styles.search,
          {
            backgroundColor: theme.background.muted,
            color: theme.text.primary,
            borderColor: theme.border.default,
          },
        ]}
      />

      <View style={styles.chips}>
        {filterChip('', 'Todos')}
        {filterChip('published', 'Publicados')}
        {filterChip('draft', 'Borradores')}
      </View>

      {stats && (
        <Text style={[styles.stats, { color: theme.text.muted }]}>
          {stats.total} artículos · {stats.published} publicados · {stats.draft} borradores
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={theme.brand.solid} />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          ListEmptyComponent={
            <EmptyState
              title="No hay artículos"
              description="El asistente no puede responder nada hasta que cargues al menos un artículo publicado."
            />
          }
          renderItem={({ item }) => {
            const state = indexState(item)
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPreview(item)}
                style={[
                  styles.card,
                  { backgroundColor: theme.background.surface, borderColor: theme.border.default },
                ]}
              >
                <Text style={[styles.title, { color: theme.text.primary }]}>{item.title}</Text>
                <Text numberOfLines={2} style={[styles.excerpt, { color: theme.text.muted }]}>
                  {item.excerpt}
                </Text>
                <Text style={[styles.state, { color: state.color }]}>{state.label}</Text>
                {item.indexingError && (
                  <Text numberOfLines={2} style={[styles.errorDetail, { color: RED }]}>
                    {item.indexingError}
                  </Text>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => void handlePublish(item)}
                    disabled={publish.isPending}
                    style={[styles.actionBtn, { borderColor: theme.border.default }]}
                  >
                    <Text style={{ color: theme.text.secondary, fontSize: 13 }}>
                      {item.status === 'draft' ? 'Publicar' : 'Despublicar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleDelete(item)}
                    style={[styles.actionBtn, { borderColor: theme.border.default }]}
                  >
                    <Text style={{ color: RED, fontSize: 13 }}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {preview && (
        <ArticlePreview article={preview} onClose={() => setPreview(null)} />
      )}
    </Screen>
  )
}

/** Lectura del artículo completo (sin edición: eso vive en el panel web). */
function ArticlePreview({
  article,
  onClose,
}: {
  article: KbArticleListItem
  onClose: () => void
}) {
  const { theme } = useTheme()
  const { data, isLoading } = useKbArticle(article.id)

  return (
    <BottomSheet visible onClose={onClose} title={article.title}>
      {isLoading ? (
        <ActivityIndicator color={theme.brand.solid} />
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.text.muted, fontSize: 12 }}>
            {article.chunksCount > 0
              ? `Indexado en ${article.chunksCount} fragmentos.`
              : 'Sin fragmentos indexados: el asistente todavía no puede usarlo.'}
          </Text>
          <Markdown source={data?.body ?? article.excerpt} />
        </View>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginBottom: 12, lineHeight: 17 },
  search: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  stats: { fontSize: 12, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  excerpt: { fontSize: 13, lineHeight: 18 },
  state: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  errorDetail: { fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
})
