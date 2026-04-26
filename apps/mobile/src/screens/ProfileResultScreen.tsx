/**
 * ProfileResult mobile - segun Figma "04b - Profile Result - Mobile".
 * Stub: card con perfil + recomendaciones. Datos reales en Fase 3.
 */
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'

const mockResult = {
  profile: 'Moderado',
  description:
    'Tu tolerancia al riesgo es media. Podes tener exposicion a activos volatiles, pero necesitas una base estable.',
  allocation: [
    { label: 'Renta fija', pct: 40 },
    { label: 'Acciones', pct: 35 },
    { label: 'Criptomonedas', pct: 15 },
    { label: 'Cash', pct: 10 },
  ],
}

export function ProfileResultScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>
          Tu Perfil de Inversor
        </Text>

        <View style={[s.hero, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Tu perfil es</Text>
          <Text style={{ color: '#F97316', fontSize: 34, fontWeight: '800', marginTop: 4 }}>
            {mockResult.profile}
          </Text>
          <Text style={{ color: theme.text.secondary, marginTop: 8, lineHeight: 20 }}>
            {mockResult.description}
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>
            Asignacion sugerida
          </Text>
          {mockResult.allocation.map((a) => (
            <View key={a.label} style={s.row}>
              <Text style={{ color: theme.text.primary }}>{a.label}</Text>
              <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{a.pct}%</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={() => nav.replace('Dashboard')}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Ir al Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => nav.replace('ProfileTest')}>
          <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Repetir el test</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  hero: { padding: 20, borderWidth: 1, borderRadius: 18, alignItems: 'center' },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  primaryBtn: { backgroundColor: '#F97316', padding: 14, borderRadius: 10, alignItems: 'center' },
})
