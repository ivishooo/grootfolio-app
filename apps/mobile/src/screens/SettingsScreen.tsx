import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { formatCurrency } from '@grootfolio/shared'

const CURRENCIES = ['USD', 'ARS', 'EUR'] as const

export function SettingsScreen() {
  const { theme, themeName, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  // Preview de formato solamente; la moneda base real se define en la Fase F
  // (persistencia de preferencia). Por ahora es estado local sin efecto global.
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD')

  const cardStyle = [s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background.canvas }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={[s.title, { color: theme.text.primary }]}>Configuración</Text>

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
  logout: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
})
