/**
 * Perfil de inversor · resultado en mobile (rediseño v2, Fase 5). Espejo de la
 * web: «Tu perfil es» + pastilla en tinta invertida, medidor neutro de 3
 * segmentos, descripción y «Tu cartera vs. la sugerida».
 */
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ASIGNACION_SUGERIDA, formatDate } from '@grootfolio/shared'
import type { AssetType, RiskProfileType } from '@grootfolio/shared'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { usePortfolio, useQuizResult } from '@/lib/queries'
import { assetColor } from '@/lib/asset-visual'
import { Screen } from '@/components/ui/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'

const LABEL: Record<RiskProfileType, string> = { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' }
const ORDER: RiskProfileType[] = ['conservative', 'moderate', 'aggressive']
const CLASSES: Array<{ type: AssetType; label: string }> = [
  { type: 'crypto', label: 'Cripto' },
  { type: 'stock', label: 'Acciones' },
  { type: 'bond', label: 'Bonos' },
  { type: 'currency', label: 'Divisas y efectivo' },
]

export function ProfileResultScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: result, isLoading, isError, error, refetch } = useQuizResult()
  const { data: portfolio } = usePortfolio()
  const card = { backgroundColor: theme.background.surface, borderColor: theme.border.default, borderWidth: 1, borderRadius: 16, padding: 16 } as const

  if (isLoading) return <LoadingState label="Cargando tu perfil…" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil.'} onRetry={() => void refetch()} />

  const total = portfolio?.totalValue ?? 0
  const now = (t: AssetType) => {
    const v = portfolio?.distribution.find((d) => d.type === t)?.value ?? 0
    return total > 0 ? Math.round((v / total) * 100) : 0
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>Perfil de inversor</Text>

        {!result ? (
          <View style={[card, { gap: 12 }]}>
            <EmptyState title="Todavía no hiciste el test" description="Son unas pocas preguntas y te ayudan a leer tu cartera." />
            <TouchableOpacity onPress={() => nav.navigate('ProfileTest', { rehacer: true })} style={{ height: 48, borderRadius: 11, backgroundColor: theme.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Hacer el test</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={card}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: theme.text.secondary, fontSize: 15 }}>Tu perfil es</Text>
                <Text style={{ color: theme.background.surface, backgroundColor: theme.text.primary, fontSize: 16, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, overflow: 'hidden' }}>
                  {LABEL[result.profile]}
                </Text>
              </View>
              <Text style={{ color: theme.text.muted, fontSize: 12, marginTop: 6 }}>test del {formatDate(result.calculatedAt)}</Text>
              <View accessible accessibilityLabel={`Perfil ${LABEL[result.profile]}, de conservador a agresivo`} style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                {ORDER.map((p) => (
                  <View key={p} style={{ flex: 1 }}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: p === result.profile ? theme.brand.solid : theme.background.muted }} />
                    <Text style={{ textAlign: 'center', marginTop: 6, fontSize: 11.5, color: p === result.profile ? theme.text.primary : theme.text.muted, fontWeight: p === result.profile ? '600' : '400' }}>
                      {LABEL[p]}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: theme.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 14 }}>{result.description}</Text>
            </View>

            <View style={card}>
              <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 14 }}>Tu cartera vs. la sugerida</Text>
              <View style={{ gap: 16 }}>
                {CLASSES.map(({ type, label }) => {
                  const c = assetColor(type)
                  const hoy = now(type)
                  const sug = ASIGNACION_SUGERIDA[result.profile][type]
                  return (
                    <View key={type}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                        <Text style={{ flex: 1, color: theme.text.primary, fontSize: 13.5 }}>{label}</Text>
                        <Text style={{ color: theme.text.primary, fontSize: 13.5, fontWeight: '700' }}>{hoy} %</Text>
                        <Text style={{ width: 64, textAlign: 'right', color: theme.text.muted, fontSize: 12 }}>sug. {sug} %</Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.background.muted, overflow: 'hidden', justifyContent: 'center' }}>
                        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${sug}%`, backgroundColor: c.accent, opacity: 0.3, borderRadius: 4 }} />
                        <View style={{ width: `${Math.min(100, hoy)}%`, height: 4, backgroundColor: c.accent, borderRadius: 2 }} />
                      </View>
                    </View>
                  )
                })}
              </View>
              <Text style={{ color: theme.text.muted, fontSize: 12.5, marginTop: 14 }}>Es una referencia educativa, no una recomendación de compra o venta.</Text>
            </View>

            <View style={{ gap: 10 }}>
              <TouchableOpacity onPress={() => nav.navigate('ProfileTest', { rehacer: true })} style={{ height: 48, borderRadius: 11, borderWidth: 1, borderColor: theme.border.strong, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Rehacer el test</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nav.navigate('Main', { screen: 'Content' } as never)} style={{ height: 48, borderRadius: 11, backgroundColor: theme.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Aprender sobre mi perfil</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}
