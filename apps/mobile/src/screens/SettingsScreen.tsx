import { ScrollView, View, Text, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { formatCurrency } from '@grootfolio/shared'
import { useDeleteAvatar, useUpdateProfile, useUploadAvatar } from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { ASSISTANT_SAFE_BOTTOM } from '@/components/assistant/tokens'

const CURRENCIES = ['USD', 'ARS', 'EUR'] as const
const VIOLET = '#8B5CF6'

function initials(name: string | null, email: string): string {
  const base = (name || email || '?').trim()
  const p = base.split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || base[0]!.toUpperCase()
}

function ProfileCard() {
  const { theme } = useTheme()
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const [name, setName] = useState(user?.fullName ?? '')

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { toast('Permiso de galería denegado.', 'error'); return }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    if (a.fileSize && a.fileSize > 2 * 1024 * 1024) { toast('La imagen supera los 2 MB.', 'error'); return }
    uploadAvatar.mutate(
      { uri: a.uri, name: a.fileName ?? `avatar-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' },
      { onSuccess: (r) => { updateUser(r.user); toast('Foto actualizada', 'success') }, onError: (e) => toast(e instanceof Error ? e.message : 'Error', 'error') }
    )
  }
  const saveName = () => {
    if (name.trim().length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return }
    updateProfile.mutate(name.trim(), { onSuccess: (r) => { updateUser(r.user); toast('Cambios guardados', 'success') }, onError: (e) => toast(e instanceof Error ? e.message : 'Error', 'error') })
  }

  return (
    <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
      <Text style={[s.section, { color: theme.text.primary }]}>Perfil</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: 74, height: 74, borderRadius: 37 }} />
        ) : (
          <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{initials(user?.fullName ?? null, user?.email ?? '')}</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text.muted, fontSize: 12 }}>JPG o PNG, máx 2 MB. Se recorta en círculo.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity onPress={pickAvatar} disabled={uploadAvatar.isPending} style={{ backgroundColor: theme.brand.solid, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: theme.text.onBrand, fontWeight: '700', fontSize: 13 }}>↑ Subir</Text></TouchableOpacity>
            {user?.avatarUrl && <TouchableOpacity onPress={() => deleteAvatar.mutate(undefined, { onSuccess: (r) => { updateUser(r.user); toast('Foto eliminada', 'info') } })} style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 13 }}>Quitar</Text></TouchableOpacity>}
          </View>
        </View>
      </View>
      <Text style={[s.label, { color: theme.text.primary }]}>Nombre visible</Text>
      <TextInput testID="settings-nombre" value={name} onChangeText={setName} maxLength={40} style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary }} />
      <Text style={{ color: theme.text.muted, fontSize: 11 }}>{name.length}/40 · Debe cumplir las normas de la comunidad.</Text>
      <TouchableOpacity testID="settings-guardar" onPress={saveName} disabled={updateProfile.isPending} style={{ alignSelf: 'flex-end', backgroundColor: theme.brand.solid, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 }}><Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>{updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}</Text></TouchableOpacity>
    </View>
  )
}

export function SettingsScreen() {
  const { theme, themeName, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  // Preview de formato solamente; la moneda base real se define en la Fase F
  // (persistencia de preferencia). Por ahora es estado local sin efecto global.
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD')

  const cardStyle = [s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background.canvas }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: ASSISTANT_SAFE_BOTTOM }}>
      <Text style={[s.title, { color: theme.text.primary }]}>Configuración</Text>

      <ProfileCard />

      {/* Notificaciones + Administración */}
      <View style={cardStyle}>
        <TouchableOpacity onPress={() => nav.navigate('Notifications')} style={s.navRow}>
          <Text style={[s.label, { color: theme.text.primary }]}>Notificaciones</Text>
          <Text style={{ color: theme.text.muted }}>›</Text>
        </TouchableOpacity>
        {user?.role === 'admin' && (
          <>
            <Text style={{ color: theme.text.muted, fontSize: 10.5, fontWeight: '700', letterSpacing: 1, marginTop: 6 }}>ADMINISTRACIÓN</Text>
            <TouchableOpacity onPress={() => nav.navigate('AdminUsers')} style={s.navRow}>
              <Text style={{ color: VIOLET, fontWeight: '600' }}>Usuarios</Text>
              <Text style={{ color: theme.text.muted }}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('AdminContent')} style={s.navRow}>
              <Text style={{ color: VIOLET, fontWeight: '600' }}>Gestión de contenidos</Text>
              <Text style={{ color: theme.text.muted }}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('AdminKb')} style={s.navRow}>
              <Text style={{ color: VIOLET, fontWeight: '600' }}>Base de conocimiento</Text>
              <Text style={{ color: theme.text.muted }}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Apariencia */}
      <View style={cardStyle}>
        <Text style={[s.section, { color: theme.text.primary }]}>Apariencia</Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: theme.text.primary }]}>Tema</Text>
            <Text style={[s.hint, { color: theme.text.muted }]}>Elegí el modo visual de la aplicación</Text>
          </View>
          <TouchableOpacity
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel="Cambiar tema"
            accessibilityState={{ selected: themeName === 'dark' }}
            style={[s.pill, { borderColor: theme.border.default }]}
          >
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>
              {themeName === 'light' ? '☀ Claro' : '☾ Oscuro'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferencias */}
      <View style={cardStyle}>
        <Text style={[s.section, { color: theme.text.primary }]}>Preferencias</Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: theme.text.primary }]}>Moneda base</Text>
            <Text style={[s.hint, { color: theme.text.muted }]}>Preview: {formatCurrency(1234, currency)}</Text>
          </View>
          <View style={s.segment}>
            {CURRENCIES.map((c) => {
              const active = c === currency
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCurrency(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    s.segmentItem,
                    { backgroundColor: active ? theme.brand.solid : 'transparent' },
                  ]}
                >
                  <Text style={{ color: active ? theme.text.onBrand : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{c}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>

      {/* Cuenta */}
      <View style={cardStyle}>
        <Text style={[s.section, { color: theme.text.primary }]}>Cuenta</Text>
        <View style={s.accountRow}>
          <Text style={[s.hint, { color: theme.text.muted }]}>Nombre</Text>
          <Text style={[s.value, { color: theme.text.primary }]}>{user?.fullName ?? '—'}</Text>
        </View>
        <View style={s.accountRow}>
          <Text style={[s.hint, { color: theme.text.muted }]}>Email</Text>
          <Text style={[s.value, { color: theme.text.primary }]}>{user?.email ?? '—'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => logout()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          testID="settings-logout"
          style={[s.logout, { borderColor: theme.danger.solid }]}
        >
          <Text style={{ color: theme.danger.solid, fontWeight: '600' }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700' },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 12 },
  section: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 2 },
  value: { fontSize: 14, fontWeight: '500' },
  pill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, borderColor: 'transparent', overflow: 'hidden' },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 8 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  logout: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
})
