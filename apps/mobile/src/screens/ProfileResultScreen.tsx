import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'

const labels = { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' } as const

const mockResult = {
  profile: 'conservative' as const,
  description:
    'Tu tolerancia al riesgo es baja. Preferis preservar tu capital con inversiones estables y de bajo riesgo.',
  allocation: [
    { label: 'Renta fija', pct: 40 },
    { label: 'Acciones', pct: 35 },
    { label: 'Criptomonedas', pct: 15 },
    { label: 'Cash', pct: 10 },
  ],
  recommendations: [
    'Priorizar instrumentos de renta fija',
    'Mantener un porcentaje bajo en renta variable',
    'Revisar el portafolio trimestralmente',
    'Diversificar entre monedas y plazos',
  ],
}

export function ProfileResultScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const chartColors = [theme.chart.series1, theme.chart.series2, theme.chart.series3, theme.chart.series4]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>
          Tu Perfil de Inversor
        </Text>

        <View style={[s.hero, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Tu perfil es</Text>
          <Text style={{ color: theme.brand.solid, fontSize: 34, fontWeight: '800', marginTop: 4 }}>
            {labels[mockResult.profile]}
          </Text>
          <Text style={{ color: theme.text.secondary, marginTop: 8, lineHeight: 20 }}>
            {mockResult.description}
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>
            Asignacion sugerida
          </Text>
          {mockResult.allocation.map((a, i) => (
            <View key={a.label} style={{ gap: 4 }}>
              <View style={s.row}>
                <Text style={{ color: theme.text.primary }}>{a.label}</Text>
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{a.pct}%</Text>
              </View>
              <View style={[s.barTrack, { backgroundColor: theme.background.muted }]}>
                <View style={[s.barFill, { width: `${a.pct}%`, backgroundColor: chartColors[i] }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 8 }}>
            Recomendaciones
          </Text>
          {mockResult.recommendations.map((r) => (
            <Text key={r} style={{ color: theme.text.secondary, lineHeight: 20 }}>- {r}</Text>
          ))}
        </View>

        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.brand.solid }]} onPress={() => nav.navigate('Main')}>
          <Text style={{ color: theme.text.onBrand, fontWeight: '600' }}>Ir al Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => nav.navigate('Main')}>
          <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Repetir el test</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  hero: { padding: 20, borderWidth: 1, borderRadius: 18, alignItems: 'center' },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  primaryBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
})
