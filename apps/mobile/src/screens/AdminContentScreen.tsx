/**
 * Admin · Gestión de contenidos mobile (F7). Carrusel de secciones, lista de
 * cards de contenido (sin tabla), y bottom sheets Subir contenido (selector de
 * tipo + picker + barra de progreso real) y Nueva sección.
 */
import { useMemo, useState } from 'react'
import { View, Text, TextInput, ScrollView, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { contentTypeLabels, formatFileSize } from '@grootfolio/shared'
import type { ContentItem, ContentSection, ContentType } from '@grootfolio/shared'
import {
  useAdminContentItems,
  useContentSections,
  useCreateSection,
  useDeleteContent,
  usePinContent,
  usePublishContent,
  useUploadContent,
  type PickedFile,
} from '@/lib/queries'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Screen } from '@/components/ui/Screen'
import { BottomSheet } from '@/components/ui/BottomSheet'

const VIOLET = '#8B5CF6'
const GREEN = '#16A34A'
const AMBER = '#D97706'
const TYPE_META: Record<ContentType, { color: string; icon: string }> = {
  doc: { color: '#DC2626', icon: '▤' }, video: { color: '#8B5CF6', icon: '▷' },
  image: { color: '#14B8A6', icon: '▣' }, link: { color: '#3B82F6', icon: '⇗' },
}
const TYPE_ORDER: ContentType[] = ['doc', 'video', 'image', 'link']

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

export function AdminContentScreen() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { data: sections = [] } = useContentSections()
  const { data: items = [], isRefetching, refetch } = useAdminContentItems()
  const pin = usePinContent()
  const del = useDeleteContent()
  const publish = usePublishContent()
  const [showUpload, setShowUpload] = useState(false)
  const [showSection, setShowSection] = useState(false)

  const countBySection = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of items) m.set(it.sectionId, (m.get(it.sectionId) ?? 0) + 1)
    return m
  }, [items])

  const itemActions = (it: ContentItem) => {
    Alert.alert(it.title, undefined, [
      ...(it.status === 'draft' ? [{ text: 'Publicar', onPress: () => publish.mutate({ id: it.id, notifyUsers: true }, { onSuccess: () => toast('Publicado y notificado', 'success') }) }] : []),
      { text: it.pinned ? 'Quitar destacado' : 'Destacar', onPress: () => pin.mutate({ id: it.id, pinned: !it.pinned }) },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirm({ title: 'Eliminar contenido', message: `¿Eliminar "${it.title}"?`, confirmLabel: 'Eliminar', onConfirm: async () => { await del.mutateAsync(it.id); toast('Contenido eliminado', 'info') } }) },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.brand.solid} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '800' }}>Contenidos</Text>
              <Text style={{ color: VIOLET, backgroundColor: 'rgba(139,92,246,0.14)', fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>SOLO ADMIN</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setShowSection(true)} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>＋ Nueva sección</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowUpload(true)} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}><Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>↑ Subir contenido</Text></TouchableOpacity>
            </View>
            <Text style={{ color: theme.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>SECCIONES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {sections.map((s) => {
                const color = s.color ?? VIOLET
                return (
                  <View key={s.id} style={{ width: 150, borderRadius: 14, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 14 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color, fontSize: 16 }}>{s.icon ?? '▤'}</Text></View>
                    <Text style={{ color: theme.text.primary, fontWeight: '700', marginTop: 8 }} numberOfLines={1}>{s.name}</Text>
                    <Text style={{ color: theme.text.muted, fontSize: 12 }}>{countBySection.get(s.id) ?? 0} elementos</Text>
                  </View>
                )
              })}
            </ScrollView>
            <Text style={{ color: theme.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 }}>TODO EL CONTENIDO</Text>
          </View>
        }
        renderItem={({ item }) => {
          const m = TYPE_META[item.type]
          return (
            <View style={{ flexDirection: 'row', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${m.color}22`, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: m.color, fontSize: 16, fontWeight: '800' }}>{m.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '700' }} numberOfLines={1}>{item.pinned ? '★ ' : ''}{item.title}</Text>
                <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 1 }}>{contentTypeLabels[item.type]}{item.sizeBytes ? ` · ${formatFileSize(item.sizeBytes)}` : ''} · {item.sectionName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text style={{ color: item.status === 'published' ? GREEN : AMBER, backgroundColor: item.status === 'published' ? `${GREEN}22` : `${AMBER}22`, fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, overflow: 'hidden' }}>{item.status === 'published' ? 'Publicado' : 'Borrador'}</Text>
                  <Text style={{ color: theme.text.muted, fontSize: 11 }}>{item.viewsCount} vistas · {formatDate(item.publishedAt)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => itemActions(item)} hitSlop={10} style={{ paddingHorizontal: 6, alignSelf: 'center' }}><Text style={{ color: theme.text.muted, fontSize: 20 }}>⋯</Text></TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={<Text style={{ color: theme.text.muted, textAlign: 'center', marginTop: 20 }}>Sin contenido. Subí tu primer material.</Text>}
      />

      {showUpload && <UploadSheet sections={sections} onClose={() => setShowUpload(false)} />}
      {showSection && <SectionSheet onClose={() => setShowSection(false)} />}
    </Screen>
  )
}

function UploadSheet({ sections, onClose }: { sections: ContentSection[]; onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const upload = useUploadContent()
  const [type, setType] = useState<ContentType>('doc')
  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [notifyUsers, setNotifyUsers] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const pick = async () => {
    try {
      if (type === 'image') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) { toast('Permiso de galería denegado.', 'error'); return }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 })
        if (!res.canceled && res.assets[0]) {
          const a = res.assets[0]
          setFile({ uri: a.uri, name: a.fileName ?? `image-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' })
        }
      } else {
        const accept = type === 'video' ? ['video/mp4', 'video/quicktime'] : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        const res = await DocumentPicker.getDocumentAsync({ type: accept, copyToCacheDirectory: true })
        if (!res.canceled && res.assets[0]) {
          const a = res.assets[0]
          setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' })
        }
      }
    } catch {
      toast('No se pudo elegir el archivo.', 'error')
    }
  }

  const submit = (pub: boolean) => {
    if (title.trim().length < 2) { setError('Poné un título (mínimo 2).'); return }
    if (!sectionId) { setError('Elegí una sección.'); return }
    if (type === 'link' && !externalUrl.trim()) { setError('Indicá la URL.'); return }
    if (type !== 'link' && !file) { setError('Adjuntá el archivo.'); return }
    setError(null); setProgress(0)
    upload.mutate(
      { type, title: title.trim(), sectionId, description: description.trim() || undefined, externalUrl: externalUrl.trim() || undefined, file, publish: pub, notifyUsers, onProgress: setProgress },
      { onSuccess: () => { toast(pub ? 'Contenido publicado' : 'Borrador guardado', 'success'); onClose() }, onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo subir.') }
    )
  }

  return (
    <BottomSheet visible onClose={onClose} title="Subir contenido">
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Tipo</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TYPE_ORDER.map((t) => {
          const m = TYPE_META[t]; const sel = type === t
          return (
            <TouchableOpacity key={t} onPress={() => { setType(t); setFile(null) }} style={{ width: '47%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: sel ? m.color : theme.border.default, backgroundColor: sel ? `${m.color}14` : 'transparent' }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: `${m.color}22`, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: m.color, fontWeight: '800' }}>{m.icon}</Text></View>
              <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '600' }}>{contentTypeLabels[t]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <TextInput placeholder="Título" placeholderTextColor={theme.text.placeholder} value={title} onChangeText={setTitle} style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary }} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Sección</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {sections.map((s) => (
          <TouchableOpacity key={s.id} onPress={() => setSectionId(s.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: sectionId === s.id ? theme.brand.solid : theme.border.default, backgroundColor: sectionId === s.id ? theme.brand.subtle : 'transparent' }}>
            <Text style={{ color: sectionId === s.id ? theme.brand.solid : theme.text.secondary, fontSize: 13, fontWeight: '600' }}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {type === 'link' ? (
        <TextInput placeholder="https://…" placeholderTextColor={theme.text.placeholder} value={externalUrl} onChangeText={setExternalUrl} autoCapitalize="none" style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary }} />
      ) : (
        <TouchableOpacity onPress={pick} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border.default, borderRadius: 12, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ color: file ? theme.text.primary : theme.text.muted, fontSize: 13, fontWeight: file ? '600' : '400' }}>{file ? `${file.name} · ${file.type}` : 'Elegir archivo'}</Text>
        </TouchableOpacity>
      )}
      <TextInput placeholder="Descripción (opcional)" placeholderTextColor={theme.text.placeholder} value={description} onChangeText={setDescription} multiline style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary, minHeight: 60, textAlignVertical: 'top' }} />
      <TouchableOpacity onPress={() => setNotifyUsers((v) => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.08)', padding: 12 }}>
        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: notifyUsers ? '#F97316' : theme.border.strong, backgroundColor: notifyUsers ? '#F97316' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{notifyUsers && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}</View>
        <View style={{ flex: 1 }}><Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 14 }}>Notificar a los usuarios</Text><Text style={{ color: theme.text.secondary, fontSize: 12 }}>Reciben la notificación en la campanita y push.</Text></View>
      </TouchableOpacity>
      {upload.isPending && (
        <View><Text style={{ color: theme.text.secondary, fontSize: 12, marginBottom: 4 }}>Subiendo… {progress}%</Text><View style={{ height: 8, borderRadius: 4, backgroundColor: theme.background.muted, overflow: 'hidden' }}><View style={{ height: '100%', width: `${progress}%`, backgroundColor: theme.brand.solid }} /></View></View>
      )}
      {error && <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={() => submit(false)} disabled={upload.isPending} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Guardar borrador</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => submit(true)} disabled={upload.isPending} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: upload.isPending ? 0.7 : 1 }}>
          {upload.isPending && <ActivityIndicator size="small" color={theme.text.onBrand} />}<Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>Publicar</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

function SectionSheet({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const create = useCreateSection()
  const [name, setName] = useState('')
  const submit = () => {
    if (name.trim().length < 2) { toast('Poné un nombre (mínimo 2).', 'error'); return }
    create.mutate({ name: name.trim() }, { onSuccess: () => { toast('Sección creada', 'success'); onClose() }, onError: (e) => toast(e instanceof Error ? e.message : 'Error', 'error') })
  }
  return (
    <BottomSheet visible onClose={onClose} title="Nueva sección">
      <TextInput placeholder="Ej: Impuestos" placeholderTextColor={theme.text.placeholder} value={name} onChangeText={setName} autoFocus style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity onPress={submit} disabled={create.isPending} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>{create.isPending ? 'Creando…' : 'Crear sección'}</Text></TouchableOpacity>
      </View>
    </BottomSheet>
  )
}
