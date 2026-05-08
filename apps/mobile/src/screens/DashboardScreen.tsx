import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { formatCurrency, formatPercent } from '@grootfolio/shared'

const TYPE_LABELS: Record<string, string> = {
  crypto: 'Cripto', stock: 'Acciones', bond: 'Bonos', currency: 'Divisas',
}

const mockPortfolio = {
  totalValue: 100000,
  pnlAbsolute: 3709,
  pnlPercent: 15.2,
  bestAsset: { name: 'Bitcoin' },
  distribution: [
    { type: 'crypto', value: 45000 },
    { type: 'stock', value: 32000 },
    { type: 'bond', value: 15000 },
    { type: 'currency', value: 8000 },
  ],
  monthlyReturn: [
    { month: 'Ene', value: 45000 },
    { month: 'Feb', value: 76000 },
    { month: 'Mar', value: 89000 },
    { month: 'Abr', value: 70000 },
    { month: 'May', value: 98000 },
    { month: 'Jun', value: 78000 },
  ],
  holdings: [
    { name: 'Bitcoin', type: 'crypto', value: 25000, pnl: 2500, pnlPercent: 12.5 },
    { name: 'Apple Inc.', type: 'stock', value: 18000, pnl: 1380, pnlPercent: 8.3 },
    { name: 'Ethereum', type: 'crypto', value: 20000, pnl: -640, pnlPercent: -3.2 },
    { name: 'US Treasury', type: 'bond', value: 15000, pnl: 315, pnlPercent: 2.1 },
    { name: 'EUR/USD', type: 'currency', value: 8600, pnl: 154, pnlPercent: 1.8 },
  ],
}

export function DashboardScreen() {
  const { theme } = useTheme()
  const p = mockPortfolio
  const chartColors = [theme.chart.series1, theme.chart.series2, theme.chart.series3, theme.chart.series4]
  const maxBar = Math.max(...p.monthlyReturn.map((m) => m.value))

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Dashboard</Text>

        {/* KPI Cards */}
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Valor Total</Text>
          <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700' }}>{formatCurrency(p.totalValue)}</Text>
          <Text style={{ color: theme.chart.positive, marginTop: 4 }}>{formatPercent(p.pnlPercent)}</Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Ganancia/Perdida</Text>
          <Text style={{ color: p.pnlAbsolute >= 0 ? theme.chart.positive : theme.chart.negative, fontSize: 24, fontWeight: '700' }}>{formatCurrency(p.pnlAbsolute)}</Text>
          <Text style={{ color: theme.text.muted }}>Este mes</Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.secondary }}>Mejor Activo</Text>
          <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700' }}>{p.bestAsset.name}</Text>
          <Text style={{ color: theme.chart.positive, marginTop: 4 }}>{formatPercent(p.pnlPercent)}</Text>
        </View>

        {/* Distribution */}
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 12 }}>Distribucion del Portafolio</Text>
          <View style={s.distRow}>
            {p.distribution.map((d, i) => (
              <View key={d.type} style={[s.distSegment, { width: `${Math.round(d.value / p.totalValue * 100)}%`, backgroundColor: chartColors[i] }]} />
            ))}
          </View>
          <View style={{ gap: 6, marginTop: 12 }}>
            {p.distribution.map((d, i) => (
              <View key={d.type} style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: chartColors[i] }]} />
                <Text style={{ color: theme.text.primary, flex: 1 }}>{TYPE_LABELS[d.type]}</Text>
                <Text style={{ color: theme.text.secondary }}>{formatCurrency(d.value)} ({Math.round(d.value / p.totalValue * 100)}%)</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Return */}
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 12 }}>Rendimiento (Enero - Junio)</Text>
          <View style={s.barChart}>
            {p.monthlyReturn.map((m) => (
              <View key={m.month} style={s.barCol}>
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <View style={[s.bar, { height: `${(m.value / maxBar) * 100}%`, backgroundColor: theme.chart.series1 }]} />
                </View>
                <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 4, textAlign: 'center' }}>{m.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Holdings */}
        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>Mis Activos</Text>
          {p.holdings.map((h) => (
            <View key={h.name} style={[s.holdingRow, { borderColor: theme.border.default }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{h.name}</Text>
                <Text style={{ color: theme.text.muted, fontSize: 12 }}>{TYPE_LABELS[h.type]}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{formatCurrency(h.value)}</Text>
                <Text style={{ color: h.pnl >= 0 ? theme.chart.positive : theme.chart.negative, fontSize: 12 }}>
                  {formatPercent(h.pnlPercent)} ({formatCurrency(h.pnl)})
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  distRow: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  distSegment: { borderRadius: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  barChart: { flexDirection: 'row', height: 160, gap: 6 },
  barCol: { flex: 1 },
  bar: { borderRadius: 4, minHeight: 4 },
  holdingRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, alignItems: 'center' },
})
