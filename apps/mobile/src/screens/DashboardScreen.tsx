import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { usePortfolio } from '@/lib/queries'
import { formatCurrency, formatPercent, assetTypeLabels, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { DashboardSkeleton } from './DashboardSkeleton'

export function DashboardScreen() {
  const { theme } = useTheme()
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()
  const chartColors = [theme.chart.series1, theme.chart.series2, theme.chart.series3, theme.chart.series4]

  const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Dashboard</Text>

        {isLoading && <DashboardSkeleton />}
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'No se pudo cargar el portfolio.'}
            onRetry={() => void refetch()}
          />
        )}

        {p && (
          <>
            <StatCard label="Valor Total" value={formatCurrency(p.totalValue)} delta={formatPercent(p.pnlPercent)} deltaColor={p.pnlPercent >= 0 ? theme.chart.positive : theme.chart.negative} />
            <StatCard label="Ganancia/Perdida" value={formatCurrency(p.pnlAbsolute)} delta={formatPercent(p.pnlPercent)} deltaColor={p.pnlAbsolute >= 0 ? theme.chart.positive : theme.chart.negative} />
            <StatCard label="Mejor Activo" value={p.bestAsset?.name ?? '—'} delta={p.bestAsset ? formatPercent(p.pnlPercent) : ''} deltaColor={theme.chart.positive} />

            <Card title="Distribución del Portafolio">
              {p.distribution.length === 0 ? (
                <EmptyState title="Sin datos para mostrar" description="Cargá activos para ver la distribución." />
              ) : (
                <>
                  <View style={s.distRow}>
                    {p.distribution.map((d, i) => (
                      <View key={d.type} style={[s.distSegment, { width: `${pct(d.value, p.totalValue)}%`, backgroundColor: chartColors[i % chartColors.length] }]} />
                    ))}
                  </View>
                  <View style={{ gap: 6, marginTop: 12 }}>
                    {p.distribution.map((d, i) => (
                      <View key={d.type} style={s.legendRow}>
                        <View style={[s.legendDot, { backgroundColor: chartColors[i % chartColors.length] }]} />
                        <Text style={{ color: theme.text.primary, flex: 1 }}>{assetTypeLabels[d.type as AssetType] ?? d.type}</Text>
                        <Text style={{ color: theme.text.secondary }}>{formatCurrency(d.value)} ({pct(d.value, p.totalValue)}%)</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>

            <Card title="Rendimiento mensual">
              {p.monthlyReturn.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="Se mostrará cuando haya datos históricos." />
              ) : (
                <View style={s.barChart}>
                  {p.monthlyReturn.map((m) => {
                    const maxBar = Math.max(...p.monthlyReturn.map((x) => x.value))
                    return (
                      <View key={m.month} style={s.barCol}>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <View style={[s.bar, { height: `${maxBar > 0 ? (m.value / maxBar) * 100 : 0}%`, backgroundColor: theme.chart.series1 }]} />
                        </View>
                        <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 4, textAlign: 'center' }}>{m.month}</Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </Card>

            <Card title="Mis Activos">
              {p.holdings.length === 0 ? (
                <EmptyState title="Todavía no tenés activos" description="Cargá tu primera transacción desde la pestaña Cargar." />
              ) : (
                p.holdings.map((h) => (
                  <View key={h.assetId} style={[s.holdingRow, { borderColor: theme.border.default }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{h.asset.name}</Text>
                      <Text style={{ color: theme.text.muted, fontSize: 12 }}>{assetTypeLabel[h.asset.type as AssetType] ?? h.asset.type}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{formatCurrency(h.value)}</Text>
                      <Text style={{ color: h.pnl >= 0 ? theme.chart.positive : theme.chart.negative, fontSize: 12 }}>
                        {formatPercent(h.pnlPercent)} ({formatCurrency(h.pnl)})
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  distRow: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  distSegment: { borderRadius: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  barChart: { flexDirection: 'row', height: 160, gap: 6 },
  barCol: { flex: 1 },
  bar: { borderRadius: 4, minHeight: 4 },
  holdingRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, alignItems: 'center' },
})
