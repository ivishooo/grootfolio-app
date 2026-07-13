import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RiskProfileType } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useQuizResult } from '@/lib/queries'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'

const labels: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

// Asignacion sugerida por perfil (presentacion; el backend no la devuelve).
const ALLOCATION: Record<RiskProfileType, Array<{ label: string; pct: number }>> = {
  conservative: [
    { label: 'Renta fija', pct: 60 }, { label: 'Acciones', pct: 20 },
    { label: 'Criptomonedas', pct: 5 }, { label: 'Cash', pct: 15 },
  ],
  moderate: [
    { label: 'Renta fija', pct: 40 }, { label: 'Acciones', pct: 35 },
    { label: 'Criptomonedas', pct: 15 }, { label: 'Cash', pct: 10 },
  ],
  aggressive: [
    { label: 'Renta fija', pct: 15 }, { label: 'Acciones', pct: 50 },
    { label: 'Criptomonedas', pct: 30 }, { label: 'Cash', pct: 5 },
  ],
}

export function ProfileResultScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: result, isLoading, isError, error, refetch } = useQuizResult()
  const chartColors = [theme.chart.series1, theme.chart.series2, theme.chart.series3, theme.chart.series4]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>
          Tu Perfil de Inversor
        </Text>

        {isLoading && <LoadingState label="Cargando tu perfil…" />}
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil.'}
            onRetry={() => void refetch()}
          />
        )}
        {!isLoading && !isError && !result && (
          <EmptyState title="Todavía no hiciste el test" description="Respondé el cuestionario para conocer tu perfil." />
        )}

        {result && (
          <>
            <View style={[s.hero, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
              <Text style={{ color: theme.text.secondary }}>Tu perfil es</Text>
              <Text style={{ color: theme.brand.solid, fontSize: 34, fontWeight: '800', marginTop: 4 }}>
                {labels[result.profile]}
              </Text>
              <Text style={{ color: theme.text.secondary, marginTop: 8, lineHeight: 20 }}>
                {result.description}
              </Text>
            </View>

            <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
              <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>
                Asignación sugerida
              </Text>
              {ALLOCATION[result.profile].map((a, i) => (
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
              {result.recommendations.map((r) => (
                <Text key={r} style={{ color: theme.text.secondary, lineHeight: 20 }}>- {r}</Text>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.brand.solid }]} onPress={() => nav.navigate('Main')}>
          <Text style={{ color: theme.text.onBrand, fontWeight: '600' }}>Ir al Dashboard</Text>
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
