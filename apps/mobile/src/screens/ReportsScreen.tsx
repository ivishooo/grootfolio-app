/**
 * Reportes mobile (GF-250, Fase F): espejo del ReportsPage de web. P&L realizado
 * (total + por activo), balance historico mark-to-market (barras nativas como el
 * dashboard) y ledger de operaciones valuado en USD.
 */
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useReportSummary, useReportLedger } from '@/lib/queries'
import { formatCurrency, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'

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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Reportes</Text>

        {summaryQ.isLoading ? (
          <Text style={{ color: theme.text.muted }}>Cargando reportes…</Text>
        ) : summaryQ.isError ? (
          <ErrorState
            message={summaryQ.error instanceof Error ? summaryQ.error.message : 'No se pudo cargar el reporte.'}
            onRetry={() => void summaryQ.refetch()}
          />
        ) : !s ? null : (
          <>
            <StatCard
              label="P&L Realizado"
              value={formatCurrency(s.realizedTotal)}
              deltaColor={s.realizedTotal >= 0 ? theme.chart.positive : theme.chart.negative}
            />

            <Card title="Balance histórico (mark-to-market)">
              {s.historicalBalance.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="Se muestra cuando hay snapshots históricos (crypto)." />
              ) : (
                <View style={st.barChart}>
                  {s.historicalBalance.map((m) => {
                    const maxBar = Math.max(...s.historicalBalance.map((x) => x.value), 1)
                    return (
                      <View key={m.month} style={st.barCol}>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <View style={[st.bar, { height: `${(m.value / maxBar) * 100}%`, backgroundColor: theme.chart.series2 }]} />
                        </View>
                        <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 4, textAlign: 'center' }}>{m.month}</Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </Card>

            <Card title="P&L realizado por activo">
              {s.realizedByAsset.length === 0 ? (
                <EmptyState title="Sin posiciones cerradas" description="Acá vas a ver la ganancia realizada de lo que vendiste." />
              ) : (
                s.realizedByAsset.map((r) => (
                  <View key={r.assetId} style={[st.row, { borderColor: theme.border.default }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{r.name}</Text>
                      <Text style={{ color: theme.text.muted, fontSize: 12 }}>
                        {assetTypeLabel[r.type as AssetType] ?? r.type} · {r.quantitySold} vendidas
                      </Text>
                    </View>
                    <Text style={{ color: r.realized >= 0 ? theme.chart.positive : theme.chart.negative, fontWeight: '600' }}>
                      {formatCurrency(r.realized)}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card title="Ledger de operaciones">
              {ledgerQ.isLoading ? (
                <Text style={{ color: theme.text.muted }}>Cargando operaciones…</Text>
              ) : ledger.length === 0 ? (
                <EmptyState title="Sin operaciones" description="Cargá transacciones para ver el ledger." />
              ) : (
                ledger.map((e) => (
                  <View key={e.id} style={[st.row, { borderColor: theme.border.default }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{e.name}</Text>
                      <Text style={{ color: e.kind === 'buy' ? theme.chart.positive : theme.chart.negative, fontSize: 12 }}>
                        {e.kind === 'buy' ? 'Compra' : 'Venta'} · {e.quantity} @ {e.unitPrice} {e.priceCurrency}{e.usdApprox ? ' ≈' : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{formatCurrency(e.amountUsd)}</Text>
                      <Text style={{ color: theme.text.muted, fontSize: 11 }}>{formatDate(e.purchasedAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Text style={{ color: theme.text.muted, fontSize: 11 }}>
              El balance histórico usa datos de crypto (CoinGecko); acciones y bonos se sumarán cuando
              esos proveedores tengan histórico. ≈ marca operaciones con FX aproximado a la fecha.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const st = StyleSheet.create({
  barChart: { flexDirection: 'row', height: 160, gap: 6 },
  barCol: { flex: 1 },
  bar: { borderRadius: 4, minHeight: 4 },
  row: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, alignItems: 'center', gap: 8 },
})
