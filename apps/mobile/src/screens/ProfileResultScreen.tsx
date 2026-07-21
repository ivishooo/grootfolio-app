/**
 * Detalle del perfil mobile (rediseño GF) — espejo del ProfileResultPage de web.
 * Badge con ProfileIcon y color por perfil, pill, asignación sugerida con barras
 * por clase de activo y recomendaciones con checks. Conserva los hooks reales.
 */
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RiskProfileType } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useQuizResult } from '@/lib/queries'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'
import { ProfileIcon } from '@/components/ui/icons'

const labels: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

const PROFILE_COLOR: Record<RiskProfileType, { accent: string; soft: string }> = {
  conservative: { accent: '#3B82F6', soft: 'rgba(59,130,246,0.14)' },
  moderate: { accent: '#F97316', soft: 'rgba(249,115,22,0.14)' },
  aggressive: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.14)' },
}

// Asignación sugerida por perfil (presentación; el backend no la devuelve).
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

const ALLOC_COLORS: Record<string, string> = {
  'Renta fija': '#8B5CF6',
  Acciones: '#3B82F6',
  Criptomonedas: '#F97316',
  Cash: '#14B8A6',
}

export function ProfileResultScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: result, isLoading, isError, error, refetch } = useQuizResult()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
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

        {result && (() => {
          const pc = PROFILE_COLOR[result.profile]
          return (
            <>
              <View style={[s.hero, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: pc.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <ProfileIcon profile={result.profile} color={pc.accent} size={36} />
                </View>
                <Text style={{ color: theme.text.secondary, marginTop: 12 }}>Tu perfil de inversor es</Text>
                <View style={{ backgroundColor: pc.soft, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 8, marginTop: 8 }}>
                  <Text style={{ color: pc.accent, fontSize: 18, fontWeight: '800' }}>{labels[result.profile]}</Text>
                </View>
                <Text style={{ color: theme.text.secondary, marginTop: 12, lineHeight: 20, textAlign: 'center' }}>
                  {result.description}
                </Text>
              </View>

              <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
                <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 12 }}>Asignación sugerida</Text>
                {ALLOCATION[result.profile].map((a) => {
                  const color = ALLOC_COLORS[a.label] ?? theme.brand.solid
                  return (
                    <View key={a.label} style={{ gap: 6, marginBottom: 12 }}>
                      <View style={s.row}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
                          <Text style={{ color: theme.text.primary }}>{a.label}</Text>
                        </View>
                        <Text style={{ color: theme.text.primary, fontWeight: '700' }}>{a.pct}%</Text>
                      </View>
                      <View style={[s.barTrack, { backgroundColor: theme.background.muted }]}>
                        <View style={[s.barFill, { width: `${a.pct}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  )
                })}
              </View>

              <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
                <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>Recomendaciones para vos</Text>
                {result.recommendations.map((r) => (
                  <View key={r} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: pc.soft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      <Text style={{ color: pc.accent, fontSize: 12, fontWeight: '800' }}>✓</Text>
                    </View>
                    <Text style={{ color: theme.text.secondary, flex: 1, lineHeight: 19, fontSize: 13 }}>{r}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: theme.brand.solid }]} onPress={() => nav.goBack()}>
                  <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>Rehacer test</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.secondaryBtn, { flex: 1, borderColor: theme.border.default }]} onPress={() => nav.navigate('Main')}>
                  <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Ir al Dashboard</Text>
                </TouchableOpacity>
              </View>
            </>
          )
        })()}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  hero: { padding: 22, borderWidth: 1, borderRadius: 18, alignItems: 'center' },
  card: { padding: 18, borderWidth: 1, borderRadius: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
})
