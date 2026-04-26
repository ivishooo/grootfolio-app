/**
 * Dashboard mobile - segun Figma "02 - Dashboard - Mobile".
 * Completar cards, pie chart, bar chart y tabla en Fase 3.
 */
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { formatCurrency, formatPercent } from '@grootfolio/shared'

const mockTotals = { value: 100000, pct: 15.2, pnl: 3709 }

export function DashboardScreen() {
  const { theme } = useTheme()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Dashboard</Text>
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Valor Total</Text>
          <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700' }}>{formatCurrency(mockTotals.value)}</Text>
          <Text style={{ color: '#22C55E', marginTop: 4 }}>{formatPercent(mockTotals.pct)}</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Ganancia/Perdida</Text>
          <Text style={{ color: '#22C55E', fontSize: 24, fontWeight: '700' }}>{formatCurrency(mockTotals.pnl)}</Text>
          <Text style={{ color: theme.text.muted }}>Este mes</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 8 }}>Distribucion del Portafolio</Text>
          <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.text.muted }}>[Pie chart con victory-native]</Text>
          </View>
        </View>
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 8 }}>Rendimiento (Enero - Junio)</Text>
          <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.text.muted }}>[Bar chart con victory-native]</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
})
