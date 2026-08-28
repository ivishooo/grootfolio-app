import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import { usePortfolio } from '@/lib/queries'
import { formatCurrency, formatPercent, formatShare, assetTypeLabels, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import { BarChart } from '@/components/ui/BarChart'
import { DashboardSkeleton } from './DashboardSkeleton'
import { ASSISTANT_SAFE_BOTTOM } from '@/components/assistant/tokens'

export function DashboardScreen() {
  const { theme } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()
  const chartColors = [theme.chart.series1, theme.chart.series2, theme.chart.series3, theme.chart.series4]
  /** Color del delta: neutro cuando la rentabilidad no es calculable. */
  const deltaColor = (pct: number | null) =>
    pct === null ? theme.text.secondary : pct >= 0 ? theme.chart.positive : theme.chart.negative

  const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: ASSISTANT_SAFE_BOTTOM }}>
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
            {/* pnlPercent puede ser null (sin base de costo o sin cotizacion): en
                ese caso el delta es "—" y no se pinta ni de verde ni de rojo. */}
            <StatCard testID="stat-valor-total" label="Valor total" value={formatCurrency(p.totalValue)} delta={formatPercent(p.pnlPercent)} deltaColor={deltaColor(p.pnlPercent)} />
            <StatCard testID="stat-pnl" label="Ganancia / Pérdida" value={formatCurrency(p.pnlAbsolute)} delta={formatPercent(p.pnlPercent)} deltaColor={p.pnlPercent === null ? theme.text.secondary : p.pnlAbsolute >= 0 ? theme.chart.positive : theme.chart.negative} />
            <StatCard testID="stat-mejor-activo" label="Mejor activo" value={p.bestAsset?.name ?? '—'} delta={p.bestAsset ? formatPercent(p.bestAsset.pnlPercent) : ''} deltaColor={deltaColor(p.bestAsset?.pnlPercent ?? null)} />

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
                <BarChart
                  data={p.monthlyReturn.map((m) => ({ label: m.month, value: m.value }))}
                  color={theme.chart.series1}
                  formatValue={formatCurrency}
                />
              )}
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '700', fontSize: 16 }}>
                  Mis Activos <Text style={{ color: theme.text.muted, fontWeight: '500' }}>· {p.holdings.length}</Text>
                </Text>
                {p.holdings.length > 0 ? (
                  <Button size="sm" onPress={() => navigation.navigate('AddAsset')}>+ Cargar</Button>
                ) : null}
              </View>

              {p.holdings.length === 0 ? (
                <View style={{ gap: 12 }}>
                  <EmptyState
                    title="Todavía no tenés activos"
                    description="Cargá tu primera transacción para empezar a ver tu portafolio."
                  />
                  <Button fullWidth onPress={() => navigation.navigate('AddAsset')}>Cargar activo</Button>
                </View>
              ) : (
                p.holdings.map((h) => {
                  const c = assetColor(h.asset.type)
                  const pct = p.totalValue > 0 ? (h.value / p.totalValue) * 100 : 0
                  const known = h.pnlPercent !== null
                  const up = h.pnl >= 0
                  const pnlColor = !known ? theme.text.muted : up ? theme.chart.positive : theme.chart.negative
                  return (
                    <View key={h.assetId} style={[s.holdingRow, { borderColor: theme.border.default }]}>
                      <AssetAvatar asset={h.asset} size={34} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ color: theme.text.primary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{h.asset.name}</Text>
                          <Text style={[s.chip, { color: c.accent, backgroundColor: c.soft }]}>{h.asset.symbol}</Text>
                        </View>
                        <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 2 }}>
                          {assetTypeLabel[h.asset.type as AssetType] ?? h.asset.type} · {formatCurrency(h.avgPrice)} → {formatCurrency(h.currentPrice)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.background.muted, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: c.accent, borderRadius: 3 }} />
                          </View>
                          <Text style={{ color: theme.text.muted, fontSize: 10 }}>{formatShare(pct)}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: theme.text.primary, fontWeight: '700' }}>{formatCurrency(h.value)}</Text>
                        <Text style={{ color: pnlColor, fontSize: 12, fontWeight: '600' }}>{formatCurrency(h.pnl)}</Text>
                        <Text style={{ color: pnlColor, fontSize: 11 }}>{formatPercent(h.pnlPercent)}</Text>
                      </View>
                    </View>
                  )
                })
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
  holdingRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, alignItems: 'center' },
  chip: { fontSize: 10, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, overflow: 'hidden' },
})
