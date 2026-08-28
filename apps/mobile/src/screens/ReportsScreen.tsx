/**
 * Reportes mobile (rediseño GF) — espejo del ReportsPage de web. 3 stat cards
 * con badge de ícono, línea de P&L acumulado (SVG), barras de balance histórico,
 * y listas de P&L por activo y ledger con AssetAvatar + chips de operación.
 */
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import Svg, { Polyline } from 'react-native-svg'
import { useTheme } from '@/theme/ThemeProvider'
import { BarChart } from '@/components/ui/BarChart'
import { useReportSummary, useReportLedger } from '@/lib/queries'
import { formatCurrency, formatPercent, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import { ASSISTANT_SAFE_BOTTOM } from '@/components/assistant/tokens'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function ReportsScreen() {
  const { theme } = useTheme()
  const summaryQ = useReportSummary()
  const ledgerQ = useReportLedger()
  const s = summaryQ.data
  const ledger = ledgerQ.data ?? []

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: ASSISTANT_SAFE_BOTTOM }}>
        <View>
          <Text style={{ color: theme.text.primary, fontSize: 22, fontWeight: '800' }}>Reportes</Text>
          <Text style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }}>
            Ganancia realizada, balance histórico y ledger de operaciones.
          </Text>
        </View>

        {summaryQ.isLoading ? (
          <Text style={{ color: theme.text.muted }}>Cargando reportes…</Text>
        ) : summaryQ.isError ? (
          <ErrorState
            message={summaryQ.error instanceof Error ? summaryQ.error.message : 'No se pudo cargar el reporte.'}
            onRetry={() => void summaryQ.refetch()}
          />
        ) : !s ? null : (
          <>
            <ReportStat icon="↗" iconColor="#16A34A" iconBg="rgba(34,197,94,0.13)" label="P&L Realizado"
              value={formatCurrency(s.realizedTotal)} valueColor={s.realizedTotal >= 0 ? theme.chart.positive : theme.chart.negative}
              sub="Sobre posiciones cerradas" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ReportStat icon="⇄" iconColor="#3B82F6" iconBg="rgba(59,130,246,0.13)" label="Ventas"
                  value={String(s.realizedSeries.length)} sub="Cierres" />
              </View>
              <View style={{ flex: 1 }}>
                <ReportStat icon="◈" iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.13)" label="Operados"
                  value={String(s.realizedByAsset.length)} sub="Incl. cerrados" />
              </View>
            </View>

            <Card title="P&L realizado acumulado">
              {s.realizedSeries.length === 0 ? (
                <EmptyState title="Sin ventas aún" description="El P&L realizado aparece cuando vendés (total o parcial)." />
              ) : (
                <RealizedLine points={[0, ...s.realizedSeries.map((p) => p.cumulative)]} color={theme.chart.series1} />
              )}
            </Card>

            <Card title="Balance histórico (mark-to-market)">
              {s.historicalBalance.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="Se muestra cuando hay snapshots históricos (crypto)." />
              ) : (
                <BarChart
                  data={s.historicalBalance.map((m) => ({ label: m.month, value: m.value }))}
                  // Mismo dato que el Dashboard (valor del portafolio): mismo color.
                  color={theme.chart.series1}
                  formatValue={formatCurrency}
                />
              )}
            </Card>

            <Card title="P&L realizado por activo">
              {s.realizedByAsset.length === 0 ? (
                <EmptyState title="Sin posiciones cerradas" description="Acá vas a ver la ganancia realizada de lo que vendiste." />
              ) : (
                s.realizedByAsset.map((r) => {
                  const c = assetColor(r.type)
                  const up = r.realized >= 0
                  const pct = r.costBasis ? (r.realized / r.costBasis) * 100 : 0
                  const pnlColor = up ? theme.chart.positive : theme.chart.negative
                  return (
                    <View key={r.assetId} style={[st.row, { borderColor: theme.border.default }]}>
                      <AssetAvatar asset={{ symbol: r.symbol, name: r.name, type: r.type }} size={32} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ color: theme.text.primary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{r.name}</Text>
                          <Text style={[st.chip, { color: c.accent, backgroundColor: c.soft }]}>{r.symbol}</Text>
                        </View>
                        <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 2 }}>
                          {assetTypeLabel[r.type as AssetType] ?? r.type} · {r.quantitySold} vendidas · costo {formatCurrency(r.costBasis)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: pnlColor, fontWeight: '700' }}>{formatCurrency(r.realized)}</Text>
                        <Text style={{ color: pnlColor, fontSize: 11 }}>{formatPercent(pct)}</Text>
                      </View>
                    </View>
                  )
                })
              )}
            </Card>

            <Card title="Ledger de operaciones">
              {ledgerQ.isLoading ? (
                <Text style={{ color: theme.text.muted }}>Cargando operaciones…</Text>
              ) : ledger.length === 0 ? (
                <EmptyState title="Sin operaciones" description="Cargá transacciones para ver el ledger." />
              ) : (
                ledger.map((e) => {
                  const buy = e.kind === 'buy'
                  const kc = buy ? theme.chart.positive : theme.chart.negative
                  return (
                    <View key={e.id} style={[st.row, { borderColor: theme.border.default }]}>
                      <AssetAvatar asset={{ symbol: e.symbol, name: e.name, type: e.type }} size={30} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: theme.text.primary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{e.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <Text style={[st.opChip, { color: kc, backgroundColor: buy ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)' }]}>
                            {buy ? '↓ Compra' : '↑ Venta'}
                          </Text>
                          <Text style={{ color: theme.text.muted, fontSize: 11 }}>
                            {e.quantity} @ {e.unitPrice} {e.priceCurrency}{e.usdApprox ? ' ≈' : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: theme.text.primary, fontWeight: '700' }}>{formatCurrency(e.amountUsd)}</Text>
                        <Text style={{ color: theme.text.muted, fontSize: 11 }}>{formatDate(e.purchasedAt)}</Text>
                      </View>
                    </View>
                  )
                })
              )}
            </Card>

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.28)', backgroundColor: 'rgba(59,130,246,0.08)', padding: 12 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontStyle: 'italic' }}>i</Text>
              </View>
              <Text style={{ color: theme.text.secondary, fontSize: 11, flex: 1, lineHeight: 16 }}>
                El balance histórico usa datos de crypto (CoinGecko); acciones y bonos se sumarán cuando esos
                proveedores tengan histórico. ≈ marca operaciones con FX aproximado a la fecha.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

function ReportStat({ icon, iconColor, iconBg, label, value, valueColor, sub }: {
  icon: string; iconColor: string; iconBg: string; label: string; value: string; valueColor?: string; sub?: string
}) {
  const { theme } = useTheme()
  return (
    <View style={[st.statCard, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: iconColor, fontSize: 13, fontWeight: '700' }}>{icon}</Text>
        </View>
        <Text style={{ color: theme.text.secondary, fontSize: 13 }}>{label}</Text>
      </View>
      <Text style={{ color: valueColor ?? theme.text.primary, fontSize: 22, fontWeight: '800', marginTop: 8 }}>{value}</Text>
      {sub ? <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  )
}

/** Línea de P&L acumulado con SVG normalizada a un viewBox 100x40. */
function RealizedLine({ points, color }: { points: number[]; color: string }) {
  const { theme } = useTheme()
  if (points.length === 0) return null
  const min = Math.min(...points, 0)
  const max = Math.max(...points, 0)
  const range = max - min || 1
  const n = points.length
  const coords = points
    .map((v, i) => {
      const x = n === 1 ? 50 : (i / (n - 1)) * 100
      const y = 40 - ((v - min) / range) * 40
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  return (
    <View style={{ gap: 6 }}>
      <Svg width="100%" height={120} viewBox="0 0 100 40" preserveAspectRatio="none">
        <Polyline points={coords} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.text.muted, fontSize: 11 }}>{formatCurrency(min)}</Text>
        <Text style={{ color: theme.text.muted, fontSize: 11 }}>{formatCurrency(max)}</Text>
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  statCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, alignItems: 'center' },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  opChip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
})
