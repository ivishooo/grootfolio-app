/**
 * Reportes en mobile (rediseño v2, Fase 5). Espejo de la web: KPI del año,
 * «Ganancia realizada acumulada» en barras, «Operaciones» como lista y la nota
 * de fuentes. «Exportar CSV» abre la hoja de compartir del sistema con el CSV.
 */
import { ScrollView, View, Text, TouchableOpacity, Share } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useReportSummary, useReportLedger } from '@/lib/queries'
import { formatCompactNumber, formatCurrency, formatDate, formatQuantity } from '@grootfolio/shared'
import type { LedgerEntry } from '@grootfolio/shared'
import { useMoney, signedMoney } from '@/lib/money'
import { Screen } from '@/components/ui/Screen'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'

/** Padding inferior del SPEC: es el lugar de Groot sobre las tabs. */
const GROOT_SPACE = 150
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })

function toCsv(ledger: LedgerEntry[], currency: string, convert: (usd: number) => number): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return [
    ['Fecha', 'Activo', 'Símbolo', 'Operación', 'Cantidad', 'Precio', 'Moneda del precio', `Monto (${currency})`],
    ...ledger.map((e) => [
      formatDate(e.purchasedAt),
      e.name,
      e.symbol,
      e.kind === 'buy' ? 'Compra' : 'Venta',
      String(e.quantity),
      String(e.unitPrice),
      e.priceCurrency,
      convert(e.amountUsd).toFixed(2),
    ]),
  ]
    .map((r) => r.map(esc).join(','))
    .join('\n')
}

export function ReportsScreen() {
  const { theme } = useTheme()
  const money = useMoney()
  const summaryQ = useReportSummary()
  const ledgerQ = useReportLedger()
  const s = summaryQ.data
  const ledger = ledgerQ.data ?? []

  const year = new Date().getFullYear()
  const series = s?.realizedSeries ?? []
  const before = series.filter((p) => new Date(p.date).getFullYear() < year).at(-1)?.cumulative ?? 0
  const thisYear = series.filter((p) => new Date(p.date).getFullYear() === year)
  const realizedYear = (thisYear.at(-1)?.cumulative ?? before) - before
  const traded = new Set(ledger.map((e) => e.assetId)).size
  const maxBar = Math.max(1, ...series.map((p) => Math.abs(p.cumulative)))
  const card = { backgroundColor: theme.background.surface, borderColor: theme.border.default, borderWidth: 1, borderRadius: 16 } as const

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, gap: 14, paddingBottom: GROOT_SPACE }}>
        <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>Reportes</Text>

        {summaryQ.isLoading && <Text style={{ color: theme.text.muted }}>Cargando reportes…</Text>}
        {summaryQ.isError && (
          <ErrorState message={summaryQ.error instanceof Error ? summaryQ.error.message : 'No se pudo cargar el reporte.'} onRetry={() => void summaryQ.refetch()} />
        )}

        {s && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={[card, { width: '100%', padding: 16 }]}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Ganancia realizada · {year}</Text>
                <Text style={{ color: realizedYear >= 0 ? theme.trend.pos : theme.trend.neg, fontSize: 26, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 }}>
                  {signedMoney(money.format, realizedYear)}
                </Text>
                <Text style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>De lo que ya vendiste</Text>
              </View>
              <View style={[card, { flex: 1, padding: 14 }]}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Ventas</Text>
                <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '700', marginTop: 6 }}>{series.length}</Text>
                <Text style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>totales o parciales</Text>
              </View>
              <View style={[card, { flex: 1, padding: 14 }]}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Activos operados</Text>
                <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '700', marginTop: 6 }}>{traded}</Text>
                <Text style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>incluye los que ya no tenés</Text>
              </View>
            </View>

            <View style={[card, { padding: 16 }]}>
              <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 14 }}>Ganancia realizada acumulada</Text>
              {series.length === 0 ? (
                <EmptyState title="Sin ventas aún" description="La ganancia realizada aparece cuando vendés, total o parcialmente." />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, minWidth: '100%' }}>
                  {series.map((p, i) => {
                    const last = i === series.length - 1
                    const color = p.cumulative >= 0 ? theme.trend.pos : theme.trend.neg
                    return (
                      <View key={`${p.date}-${i}`} style={{ flex: 1, minWidth: 44, alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: theme.text.muted, fontSize: 10.5 }}>{formatCompactNumber(money.convert(p.cumulative))}</Text>
                        <View style={{ height: 120, width: '100%', justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border.default }}>
                          <View
                            style={{
                              width: '100%',
                              maxWidth: 64,
                              height: `${Math.max(3, Math.round((Math.abs(p.cumulative) / maxBar) * 100))}%`,
                              borderTopLeftRadius: 6,
                              borderTopRightRadius: 6,
                              borderBottomLeftRadius: 2,
                              borderBottomRightRadius: 2,
                              backgroundColor: color,
                              opacity: last ? 1 : 0.35,
                            }}
                          />
                        </View>
                        <Text style={{ color: theme.text.muted, fontSize: 11.5 }}>{shortDate(p.date)}</Text>
                      </View>
                    )
                  })}
                </ScrollView>
              )}
            </View>

            <View style={[card, { paddingTop: 16, paddingHorizontal: 14, paddingBottom: 6 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ flex: 1, color: theme.text.primary, fontSize: 15, fontWeight: '600' }}>
                  Operaciones <Text style={{ color: theme.text.muted, fontWeight: '500' }}>· {ledger.length}</Text>
                </Text>
                {ledger.length > 0 && (
                  <TouchableOpacity
                    testID="reportes-exportar"
                    onPress={() => void Share.share({ title: 'Operaciones GrootFolio', message: toCsv(ledger, money.currency, money.convert) })}
                    accessibilityRole="button"
                    style={{ height: 32, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border.strong, justifyContent: 'center' }}
                  >
                    <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>Exportar CSV</Text>
                  </TouchableOpacity>
                )}
              </View>
              {ledgerQ.isLoading ? (
                <Text style={{ color: theme.text.muted, paddingVertical: 12 }}>Cargando operaciones…</Text>
              ) : ledger.length === 0 ? (
                <EmptyState title="Sin operaciones" description="Cargá una compra o una venta para verla acá." />
              ) : (
                ledger.map((e) => {
                  const buy = e.kind === 'buy'
                  return (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border.default }}>
                      <AssetAvatar asset={{ symbol: e.symbol, name: e.name, type: e.type }} size={30} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 13.5, fontWeight: '600' }}>{e.name}</Text>
                        <Text numberOfLines={1} style={{ color: theme.text.muted, fontSize: 12 }}>
                          {shortDate(e.purchasedAt)} · {formatQuantity(e.quantity)} u a {formatCurrency(e.unitPrice, e.priceCurrency)}
                          {e.usdApprox ? ' ≈' : ''}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: buy ? theme.trend.pos : theme.trend.neg,
                          backgroundColor: buy ? theme.trend.posSoft : theme.trend.negSoft,
                          fontSize: 11.5,
                          fontWeight: '600',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          overflow: 'hidden',
                        }}
                      >
                        {buy ? 'Compra' : 'Venta'}
                      </Text>
                      <Text style={{ width: 80, textAlign: 'right', color: theme.text.primary, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                        {money.format(e.amountUsd)}
                      </Text>
                    </View>
                  )
                })
              )}
            </View>

            <Text style={{ color: theme.text.muted, fontSize: 12.5, lineHeight: 18 }}>
              Los precios históricos salen de CoinGecko (cripto); acciones y bonos se suman cuando esos proveedores tengan histórico. El símbolo ≈ marca
              operaciones con tipo de cambio aproximado a la fecha.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}
