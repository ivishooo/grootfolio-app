import { ScrollView, View, Text, TouchableOpacity, TextInput, Image, StyleSheet, Switch } from 'react-native'
import { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as ImagePicker from 'expo-image-picker'
import { useGroot } from '@/components/groot/GrootProvider'
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { SUPPORTED_CURRENCIES, currencyLabels, formatCurrency } from '@grootfolio/shared'
import type { SupportedCurrency } from '@grootfolio/shared'
import { useDeleteAvatar, useUpdateProfile, useUploadAvatar } from '@/lib/queries'
import { useMoney } from '@/lib/money'
import { useToast } from '@/components/ui/ToastProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'


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
    updateProfile.mutate({ fullName: name.trim() }, { onSuccess: (r) => { updateUser(r.user); toast('Cambios guardados', 'success') }, onError: (e) => toast(e instanceof Error ? e.message : 'Error', 'error') })
  }

  return (
    <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
      <Text style={[s.section, { color: theme.text.primary }]}>Perfil</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: 60, height: 60, borderRadius: 30 }} />
        ) : (
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: theme.brand.subtle, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.brand.ink, fontSize: 22, fontWeight: '700' }}>{initials(user?.fullName ?? null, user?.email ?? '')}</Text></View>
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

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]

/** Segmentado del SPEC: contenedor muted, padding 3, radio 10; la opción activa en surface. */
function ThemeSegmented() {
  const { theme, preference, setPreference } = useTheme()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Tema" style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: theme.background.muted, marginTop: 10 }}>
      {THEME_OPTIONS.map(({ value, label }) => {
        const on = preference === value
        return (
          <TouchableOpacity
            key={value}
            testID={`tema-${value}`}
            onPress={() => setPreference(value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? theme.background.surface : 'transparent',
              shadowColor: '#0F172A',
              shadowOpacity: on ? 0.12 : 0,
              shadowRadius: 1,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Text style={{ color: on ? theme.text.primary : theme.text.muted, fontSize: 14, fontWeight: '600' }}>{label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export function SettingsScreen() {
  const { theme } = useTheme()
  const groot = useGroot()
  const { user, updateUser, logout } = useAuth()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { toast } = useToast()
  const updateCurrency = useUpdateProfile()
  const money = useMoney()
  // La moneda vive en el perfil (`PATCH /me`) y se aplica en todas las
  // pantallas via `useMoney`. Antes era un `useState` suelto: se elegia ARS, no
  // pasaba nada, y al reabrir la app volvia a USD.
  const currency = (user?.baseCurrency ?? 'USD') as SupportedCurrency

  const changeCurrency = (next: SupportedCurrency) => {
    if (next === currency) return
    updateCurrency.mutate(
      { baseCurrency: next },
      {
        onSuccess: (r) => {
          updateUser(r.user)
          toast('Moneda actualizada', 'success', { description: `Vas a ver los importes en ${next}.` })
        },
        onError: (e) => toast(e instanceof Error ? e.message : 'No se pudo cambiar la moneda.', 'error'),
      }
    )
  }

  const cardStyle = [s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]

  // SPEC › Configuración: Perfil, Preferencias (moneda y tema), Avisos (solo
  // «Mostrar a Groot»: los switches sin backend no se dibujan) y «Cerrar
  // sesión» como link. Administración queda para admins: es el único acceso
  // mobile a Contenidos y Base de conocimiento.
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background.canvas }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>Configuración</Text>

      <ProfileCard />

      <View style={cardStyle}>
        <Text style={[s.section, { color: theme.text.primary }]}>Preferencias</Text>
        <View style={{ gap: 8 }}>
          <Text style={[s.label, { color: theme.text.primary }]}>Moneda</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: theme.background.muted }}>
            {SUPPORTED_CURRENCIES.map((c) => {
              const active = c === currency
              return (
                <TouchableOpacity
                  key={c}
                  testID={`moneda-${c}`}
                  onPress={() => changeCurrency(c)}
                  disabled={updateCurrency.isPending}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active, disabled: updateCurrency.isPending }}
                  accessibilityLabel={`Ver los importes en ${currencyLabels[c]}`}
                  style={{ flex: 1, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.background.surface : 'transparent', opacity: updateCurrency.isPending ? 0.6 : 1 }}
                >
                  <Text style={{ color: active ? theme.text.primary : theme.text.muted, fontWeight: '600', fontSize: 14 }}>{c}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <Text style={[s.hint, { color: theme.text.muted }]}>
            {formatCurrency(1234)} se ve como {money.format(1234)}. Las operaciones se guardan en USD.
          </Text>
          {money.isFallback && (
            <Text style={{ color: theme.warning.solid, fontSize: 12 }}>No pudimos obtener la cotización de {money.preferred}; por ahora se muestra en USD.</Text>
          )}
        </View>
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.border.default, paddingTop: 12 }}>
          <Text style={[s.label, { color: theme.text.primary }]}>Tema</Text>
          <ThemeSegmented />
          <Text style={[s.hint, { color: theme.text.muted }]}>«Sistema» sigue la configuración del teléfono.</Text>
        </View>
      </View>

      <View style={cardStyle}>
        <Text style={[s.section, { color: theme.text.primary }]}>Avisos</Text>
        <View style={[s.row, { gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: theme.text.primary }]}>Mostrar a Groot</Text>
            <Text style={[s.hint, { color: theme.text.muted }]}>El gato que te cuenta cómo viene el día. Lo podés ocultar cuando quieras.</Text>
          </View>
          <Switch
            testID="settings-groot"
            value={groot.visible}
            onValueChange={groot.setVisible}
            accessibilityLabel="Mostrar a Groot"
            trackColor={{ true: theme.brand.solid, false: theme.border.strong }}
            ios_backgroundColor={theme.border.strong}
          />
        </View>
      </View>

      {user?.role === 'admin' && (
        <View style={cardStyle}>
          <Text style={[s.section, { color: theme.text.primary }]}>Administración</Text>
          {(
            [
              ['AdminUsers', 'Usuarios'],
              ['AdminContent', 'Gestión de contenidos'],
              ['AdminKb', 'Base de conocimiento'],
            ] as const
          ).map(([route, label]) => (
            <TouchableOpacity key={route} onPress={() => nav.navigate(route)} accessibilityRole="button" style={[s.navRow, { minHeight: 44 }]}>
              <Text style={[s.label, { color: theme.text.primary }]}>{label}</Text>
              <Text style={{ color: theme.text.muted }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={() => logout()}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        testID="settings-logout"
        style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        <Text style={{ color: theme.trend.neg, fontWeight: '600', fontSize: 15 }}>Cerrar sesión</Text>
      </TouchableOpacity>
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
