/**
 * Inicio en mobile (rediseño v2, Fase 4). Espejo de apps/web/.../DashboardPage:
 * saludo con la hora de los precios, valor total (a toda la fila), ganancia
 * total y mejor activo, «Cómo está repartido» como barra apilada, «Valor del
 * portafolio · últimos 6 meses» y «Mis activos» con 5 filas.
 *
 * El chip «▲ 1,2 % hoy» va debajo del valor total, con `dayChangePercent` de
 * GET /portfolio (GF-019); sin dato no se dibuja.
 */
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { usePortfolio } from '@/lib/queries'
import { formatCompactNumber, formatPctArrow, formatPercent, assetTypeLabels } from '@grootfolio/shared'
import type { AssetType, Holding } from '@grootfolio/shared'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { DayChip } from '@/components/ui/DayChip'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import { DashboardSkeleton } from './DashboardSkeleton'
import { useMoney, signedMoney } from '@/lib/money'

/** Padding inferior del SPEC: es el lugar de Groot sobre las tabs. */
const GROOT_SPACE = 150

function pricesStamp(updatedAt: number): string {
  const d = new Date(updatedAt)
  const day = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', '')
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} · precios de las ${time}`
}

export function DashboardScreen() {
  const money = useMoney()
  const { theme } = useTheme()
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: p, isLoading, isError, error, refetch, dataUpdatedAt } = usePortfolio()
  const name = user?.fullName?.trim().split(/\s+/)[0]

  const card = {
    backgroundColor: theme.background.surface,
    borderColor: theme.border.default,
    borderWidth: 1,
    borderRadius: 16,
  } as const

  const months = (p?.monthlyReturn ?? []).slice(-6)
  const maxMonth = Math.max(1, ...months.map((m) => m.value))
  const holdings = [...(p?.holdings ?? [])].sort((a, b) => b.value - a.value)
  const dist = (p?.distribution ?? [])
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ type: d.type as AssetType, value: d.value, pct: p && p.totalValue > 0 ? (d.value / p.totalValue) * 100 : 0 }))

  const openHolding = (h: Holding) =>
    navigation.navigate('Main', { screen: 'Assets', params: { open: h.assetId } } as never)

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, gap: 14, paddingBottom: GROOT_SPACE }}>
        <View>
          {dataUpdatedAt > 0 && (
            <Text style={{ color: theme.text.muted, fontSize: 11.5, fontFamily: 'Menlo', marginBottom: 6 }}>{pricesStamp(dataUpdatedAt)}</Text>
          )}
          <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            {name ? `Hola, ${name}` : 'Hola de nuevo'}
          </Text>
        </View>

        {isLoading && <DashboardSkeleton />}
        {isError && (
          <ErrorState message={error instanceof Error ? error.message : 'No se pudo cargar el portafolio.'} onRetry={() => void refetch()} />
        )}

        {p && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View testID="stat-valor-total" style={[card, { width: '100%', padding: 16 }]}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Valor total</Text>
                <Text style={{ color: theme.text.primary, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 6, fontVariant: ['tabular-nums'] }}>
                  {money.format(p.totalValue)}
                </Text>
                <View style={{ marginTop: 6 }}>
                  <DayChip pct={p.dayChangePercent} testID="chip-hoy" />
                </View>
                {money.currency !== 'USD' && <Text style={{ color: theme.text.muted, fontSize: 12.5, marginTop: 6 }}>Convertido a {money.currency}</Text>}
              </View>
              <View testID="stat-pnl" style={[card, { flex: 1, minWidth: 140, padding: 14 }]}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Ganancia total</Text>
                <Text style={{ color: p.pnlAbsolute >= 0 ? theme.trend.pos : theme.trend.neg, fontSize: 18, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] }}>
                  {signedMoney(money.format, p.pnlAbsolute)}
                </Text>
                <Text style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>
                  {p.pnlPercent === null ? 'Sin base de costo' : `${formatPercent(p.pnlPercent).replace('%', ' %')} sobre lo invertido`}
                </Text>
              </View>
              <View testID="stat-mejor-activo" style={[card, { flex: 1, minWidth: 140, padding: 14 }]}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Mejor activo</Text>
                <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 18, fontWeight: '700', marginTop: 6 }}>
                  {p.bestAsset?.name ?? '—'}
                </Text>
                {p.bestAsset && (
                  <Text style={{ color: (p.bestAsset.pnlPercent ?? 0) >= 0 ? theme.trend.pos : theme.trend.neg, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                    {formatPctArrow(p.bestAsset.pnlPercent)}
                  </Text>
                )}
              </View>
            </View>

            <View style={[card, { padding: 16 }]}>
              <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 14 }}>Cómo está repartido</Text>
              {dist.length === 0 ? (
                <EmptyState title="Sin datos para mostrar" description="Cargá activos para ver cómo se reparte tu portafolio." />
              ) : (
                <>
                  <View
                    accessible
                    accessibilityLabel={dist.map((d) => `${assetTypeLabels[d.type]} ${Math.round(d.pct)} %`).join(', ')}
                    style={{ flexDirection: 'row', height: 14, gap: 3, borderRadius: 7, overflow: 'hidden' }}
                  >
                    {dist.map((d) => (
                      <View key={d.type} style={{ width: `${d.pct}%`, backgroundColor: assetColor(d.type).accent, borderRadius: 3 }} />
                    ))}
                  </View>
                  <View style={{ gap: 10, marginTop: 16 }}>
                    {dist.map((d) => (
                      <View key={d.type} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: assetColor(d.type).accent }} />
                        <Text style={{ flex: 1, color: theme.text.primary, fontSize: 13.5 }}>{assetTypeLabels[d.type]}</Text>
                        <Text style={{ color: theme.text.secondary, fontSize: 13.5, fontVariant: ['tabular-nums'] }}>{money.format(d.value)}</Text>
                        <Text style={{ width: 46, textAlign: 'right', color: theme.text.primary, fontSize: 13.5, fontWeight: '600' }}>{Math.round(d.pct)} %</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            <View style={[card, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                <Text style={{ flex: 1, color: theme.text.primary, fontSize: 15, fontWeight: '600' }}>Valor del portafolio</Text>
                <Text style={{ color: theme.text.muted, fontSize: 12 }}>últimos 6 meses</Text>
              </View>
              {months.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="El valor mes a mes aparece cuando haya datos históricos." />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 150, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.border.default }}>
                    {months.map((m, i) => (
                      <View key={m.month} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <Text style={{ color: theme.text.muted, fontSize: 10.5 }}>{formatCompactNumber(money.convert(m.value))}</Text>
                        <View
                          style={{
                            width: '100%',
                            maxWidth: 44,
                            height: `${Math.max(2, Math.round((m.value / maxMonth) * 86))}%`,
                            borderTopLeftRadius: 6,
                            borderTopRightRadius: 6,
                            borderBottomLeftRadius: 2,
                            borderBottomRightRadius: 2,
                            backgroundColor: i === months.length - 1 ? theme.brand.solid : 'rgba(249,115,22,0.35)',
                          }}
                        />
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {months.map((m) => (
                      <Text key={m.month} style={{ flex: 1, textAlign: 'center', color: theme.text.muted, fontSize: 11.5 }}>{m.month}</Text>
                    ))}
                  </View>
                </>
              )}
            </View>

            <View style={[card, { paddingTop: 16, paddingHorizontal: 14, paddingBottom: 6 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ flex: 1, color: theme.text.primary, fontSize: 15, fontWeight: '600' }}>
                  Mis activos <Text style={{ color: theme.text.muted, fontWeight: '500' }}>· {holdings.length}</Text>
                </Text>
                {holdings.length > 0 && (
                  <TouchableOpacity
                    testID="inicio-ver-todos"
                    onPress={() => navigation.navigate('Main', { screen: 'Assets' } as never)}
                    accessibilityRole="button"
                    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}
                  >
                    <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '600' }}>Ver todos →</Text>
                  </TouchableOpacity>
                )}
              </View>
              {holdings.length === 0 ? (
                <View style={{ gap: 12, paddingBottom: 10 }}>
                  <EmptyState title="Todavía no tenés activos" description="Cargá tu primera compra para empezar a ver tu portafolio." />
                  <Button fullWidth onPress={() => navigation.navigate('AddAsset')}>Cargar activo</Button>
                </View>
              ) : (
                holdings.slice(0, 5).map((h) => {
                  const up = h.pnlPercent === null ? null : h.pnlPercent >= 0
                  return (
                    <TouchableOpacity
                      key={h.assetId}
                      onPress={() => openHolding(h)}
                      accessibilityRole="button"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border.default }}
                    >
                      <AssetAvatar asset={h.asset} size={34} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 13.5, fontWeight: '600' }}>{h.asset.name}</Text>
                        <Text style={{ color: theme.text.muted, fontSize: 11.5 }}>{h.asset.symbol}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: theme.text.primary, fontSize: 13.5, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                          {h.value > 0 ? money.format(h.value) : '—'}
                        </Text>
                        <Text style={{ color: up === null ? theme.text.muted : up ? theme.trend.pos : theme.trend.neg, fontSize: 12, fontWeight: '600' }}>
                          {up === null ? 'Sin cotización' : formatPctArrow(h.pnlPercent)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}
