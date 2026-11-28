/**
 * Activos en mobile (rediseño v2, Fase 4). Espejo de la web:
 * resumen (Valor hoy / Invertido | Resultado), chips por tipo con scroll
 * horizontal, «Ordenar: Valor · Resultado · A–Z» y filas que se expanden
 * enteras. Adentro: 4 datos, operaciones con «Editar» y «+ Comprar más» /
 * «Vender», que abren Cargar con el activo ya elegido. `route.params.open`
 * abre una fila expandida (lo usa Inicio).
 */
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { assetTypeLabel, formatCurrency, formatPctArrow, formatQuantity, updateTransactionInputSchema } from '@grootfolio/shared'
import type { AssetType, Holding, Transaction, UpdateTransactionInput } from '@grootfolio/shared'
import {
  useDeleteAssetPosition,
  useDeleteTransaction,
  usePortfolio,
  useTransactions,
  useUpdateTransaction,
} from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import type { TabParamList } from '@/navigation/TabNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { DayChip } from '@/components/ui/DayChip'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useMoney, signedMoney } from '@/lib/money'

/** Padding inferior del SPEC: es el lugar de Groot sobre las tabs. */
const GROOT_SPACE = 150
const TYPE_ORDER: AssetType[] = ['crypto', 'stock', 'bond', 'currency']
const SORTS = [
  { id: 'valor', label: 'Valor' },
  { id: 'resultado', label: 'Resultado' },
  { id: 'az', label: 'A–Z' },
] as const
type SortId = (typeof SORTS)[number]['id']

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const
type PriceCurrency = (typeof PRICE_CURRENCIES)[number]

function isoToDdmmyyyy(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

function ddmmyyyyToIso(input: string): string {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return ''
  }
  return date.toISOString()
}

export function AssetsScreen() {
  const { theme } = useTheme()
  const money = useMoney()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<TabParamList, 'Assets'>>()
  const { data: p, isLoading, isError, error, refetch, dataUpdatedAt } = usePortfolio()
  const { data: transactions } = useTransactions()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<AssetType | 'all'>('all')
  const [sort, setSort] = useState<SortId>('valor')
  const deletePosition = useDeleteAssetPosition()
  const { toast } = useToast()
  const confirm = useConfirm()

  // Desde Inicio: abrir la fila del activo tocado.
  const openParam = route.params?.open
  useEffect(() => {
    if (openParam) setExpanded(openParam)
  }, [openParam])

  const holdings = useMemo(() => p?.holdings ?? [], [p])
  const total = p?.totalValue ?? 0
  const invested = p ? p.totalValue - p.pnlAbsolute : 0
  const counts = useMemo(() => {
    const c = new Map<AssetType, number>()
    for (const h of holdings) c.set(h.asset.type as AssetType, (c.get(h.asset.type as AssetType) ?? 0) + 1)
    return c
  }, [holdings])
  const visible = useMemo(() => {
    const list = holdings.filter((h) => filter === 'all' || h.asset.type === filter)
    const sorted = [...list]
    if (sort === 'valor') sorted.sort((a, b) => b.value - a.value)
    if (sort === 'resultado') sorted.sort((a, b) => (b.pnlPercent ?? -Infinity) - (a.pnlPercent ?? -Infinity))
    if (sort === 'az') sorted.sort((a, b) => a.asset.name.localeCompare(b.asset.name, 'es'))
    return sorted
  }, [holdings, filter, sort])

  const handleDeletePosition = (holding: Holding) => {
    void confirm({
      title: 'Eliminar posición',
      message: `¿Eliminar toda la posición de ${holding.asset.name}? Se borran todas sus operaciones. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar posición',
      onConfirm: async () => {
        try {
          await deletePosition.mutateAsync(holding.assetId)
          toast('Posición eliminada', 'info', { description: 'Se borraron todas sus operaciones.' })
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la posición.', 'error')
          throw err
        }
      },
    })
  }

  const time = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : null
  const card = { backgroundColor: theme.background.surface, borderColor: theme.border.default, borderWidth: 1, borderRadius: 16 } as const

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, gap: 14, paddingBottom: GROOT_SPACE }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text testID="screen-activos-title" accessibilityRole="header" style={{ flex: 1, color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            Activos
          </Text>
          {time && <Text style={{ color: theme.text.muted, fontSize: 11.5, fontFamily: 'Menlo' }}>precios de las {time}</Text>}
        </View>

        {isLoading && <Text style={{ color: theme.text.muted }}>Cargando activos…</Text>}
        {isError && <ErrorState message={error instanceof Error ? error.message : 'No se pudo cargar el portafolio.'} onRetry={() => void refetch()} />}

        {p && holdings.length === 0 && (
          <View style={[card, { padding: 16, gap: 12 }]}>
            <EmptyState title="Todavía no tenés activos" description="Cargá tu primera compra para empezar a ver tu portafolio." />
            <Button testID="activos-cargar-vacio" fullWidth onPress={() => navigation.navigate('AddAsset')}>Cargar activo</Button>
          </View>
        )}

        {p && holdings.length > 0 && (
          <>
            <View style={card}>
              <View style={{ padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border.default }}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Valor hoy</Text>
                <Text style={{ color: theme.text.primary, fontSize: 26, fontWeight: '800', letterSpacing: -0.8, marginTop: 4, fontVariant: ['tabular-nums'] }}>{money.format(total)}</Text>
                <View style={{ marginVertical: 4 }}>
                  <DayChip pct={p.dayChangePercent} testID="chip-hoy-activos" />
                </View>
                <Text style={{ color: theme.text.muted, fontSize: 12 }}>{holdings.length} {holdings.length === 1 ? 'posición' : 'posiciones'}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, padding: 14, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: theme.border.default }}>
                  <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Invertido</Text>
                  <Text style={{ color: theme.text.primary, fontSize: 17, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>{money.format(invested)}</Text>
                  <Text style={{ color: theme.text.muted, fontSize: 12 }}>con comisiones</Text>
                </View>
                <View style={{ flex: 1, padding: 14, paddingHorizontal: 16 }}>
                  <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Resultado</Text>
                  <Text style={{ color: p.pnlAbsolute >= 0 ? theme.trend.pos : theme.trend.neg, fontSize: 17, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                    {signedMoney(money.format, p.pnlAbsolute)}
                  </Text>
                  <Text style={{ color: p.pnlAbsolute >= 0 ? theme.trend.pos : theme.trend.neg, fontSize: 12, fontWeight: '600' }}>{formatPctArrow(p.pnlPercent)}</Text>
                </View>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {(['all', ...TYPE_ORDER.filter((t) => counts.has(t))] as const).map((t) => {
                const on = filter === t
                const n = t === 'all' ? holdings.length : counts.get(t) ?? 0
                return (
                  <TouchableOpacity
                    key={t}
                    testID={`activos-filtro-${t}`}
                    onPress={() => setFilter(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      height: 40,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      borderWidth: 1,
                      justifyContent: 'center',
                      borderColor: on ? theme.text.primary : theme.border.default,
                      backgroundColor: on ? theme.text.primary : theme.background.surface,
                    }}
                  >
                    <Text style={{ color: on ? theme.background.surface : theme.text.primary, fontSize: 13, fontWeight: '600' }}>
                      {t === 'all' ? 'Todos' : assetTypeLabel[t]} <Text style={{ opacity: 0.6 }}>{n}</Text>
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: theme.text.muted, fontSize: 12.5 }}>Ordenar</Text>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: theme.background.muted }}>
                {SORTS.map((o) => {
                  const on = sort === o.id
                  return (
                    <TouchableOpacity
                      key={o.id}
                      onPress={() => setSort(o.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={{ height: 34, paddingHorizontal: 12, borderRadius: 7, justifyContent: 'center', backgroundColor: on ? theme.background.surface : 'transparent' }}
                    >
                      <Text style={{ color: on ? theme.text.primary : theme.text.muted, fontSize: 12.5, fontWeight: '600' }}>{o.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={[card, { overflow: 'hidden' }]}>
              {visible.map((h, i) => (
                <HoldingRow
                  key={h.assetId}
                  holding={h}
                  first={i === 0}
                  total={total}
                  transactions={(transactions ?? []).filter((tx) => tx.assetId === h.assetId)}
                  expanded={expanded === h.assetId}
                  onToggle={() => setExpanded((cur) => (cur === h.assetId ? null : h.assetId))}
                  onDeletePosition={() => handleDeletePosition(h)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

interface HoldingRowProps {
  holding: Holding
  first: boolean
  total: number
  transactions: Transaction[]
  expanded: boolean
  onToggle: () => void
  onDeletePosition: () => void
}

function HoldingRow({ holding: h, first, total, transactions, expanded, onToggle, onDeletePosition }: HoldingRowProps) {
  const { theme } = useTheme()
  const money = useMoney()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const share = total > 0 ? Math.round((h.value / total) * 100) : 0
  const sinCot = h.currentPrice <= 0
  const pnlColor = sinCot ? theme.text.muted : h.pnl >= 0 ? theme.trend.pos : theme.trend.neg
  const cargar = (kind: 'buy' | 'sell') => navigation.navigate('AddAsset', { symbol: h.asset.symbol, kind })

  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: theme.border.default, backgroundColor: expanded ? theme.brand.tint : 'transparent' }}>
      <TouchableOpacity
        testID="holding-toggle"
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${h.asset.name}, ${sinCot ? 'sin cotización' : money.format(h.value)}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 64, paddingVertical: 10, paddingHorizontal: 14 }}
      >
        <AssetAvatar asset={h.asset} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 13.5, fontWeight: '600' }}>{h.asset.name}</Text>
            <DayChip pct={sinCot ? null : h.dayChangePercent} size="sm" />
          </View>
          <Text numberOfLines={1} style={{ color: theme.text.muted, fontSize: 11.5 }}>
            {formatQuantity(h.quantity)} {h.asset.symbol} · {share} % del total
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.text.primary, fontSize: 13.5, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{sinCot ? '—' : money.format(h.value)}</Text>
          <Text style={{ color: pnlColor, fontSize: 12.5, fontWeight: '600' }}>{sinCot ? 'Sin cotización' : formatPctArrow(h.pnlPercent)}</Text>
        </View>
        <Text style={{ color: theme.text.muted, fontSize: 12, width: 14, textAlign: 'center' }}>{expanded ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 16, paddingTop: 4, gap: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['Precio promedio', money.format(h.avgPrice)],
              ['Precio hoy', sinCot ? '—' : money.format(h.currentPrice)],
              ['Invertido', money.format(h.avgPrice * h.quantity)],
              ['Resultado', sinCot ? 'Sin cotización' : signedMoney(money.format, h.pnl)],
            ].map(([label, value], i) => (
              <View key={label} style={{ width: '48%', flexGrow: 1, borderRadius: 10, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 10 }}>
                <Text style={{ color: theme.text.muted, fontSize: 12 }}>{label}</Text>
                <Text style={{ color: i === 3 ? pnlColor : theme.text.primary, fontSize: 14, fontWeight: '600', marginTop: 2 }}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>Operaciones · {transactions.length}</Text>
            {transactions.length === 0 ? (
              <Text style={{ color: theme.text.muted, fontSize: 13 }}>Sin operaciones para este activo.</Text>
            ) : (
              transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} symbol={h.asset.symbol} />)
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button testID="holding-comprar" onPress={() => cargar('buy')} style={{ flex: 1 }}>+ Comprar más</Button>
            <Button testID="holding-vender" variant="secondary" onPress={() => cargar('sell')} style={{ flex: 1 }}>Vender</Button>
          </View>
          <TouchableOpacity testID="holding-eliminar" onPress={onDeletePosition} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end' }}>
            <Text style={{ color: theme.trend.neg, fontSize: 13, fontWeight: '600' }}>Eliminar posición…</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function TransactionItem({ tx, symbol }: { tx: Transaction; symbol: string }) {
  // Sin conversión a propósito: la operación se muestra en la moneda con la que
  // se hizo (`tx.priceCurrency`), que es el registro histórico.
  const { theme } = useTheme()
  const [editing, setEditing] = useState(false)
  if (editing) return <TransactionEditForm tx={tx} onClose={() => setEditing(false)} />
  const isBuy = tx.kind === 'buy'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: theme.background.surface, paddingLeft: 10, paddingVertical: 4 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.text.muted, fontSize: 12 }}>{isoToDdmmyyyy(tx.purchasedAt)}</Text>
          <Text style={[st.opChip, { color: isBuy ? theme.trend.pos : theme.trend.neg, backgroundColor: isBuy ? theme.trend.posSoft : theme.trend.negSoft }]}>
            {isBuy ? 'Compra' : 'Venta'}
          </Text>
        </View>
        <Text style={{ color: theme.text.primary, fontSize: 13 }}>
          {formatQuantity(tx.quantity)} {symbol} a {formatCurrency(tx.unitPrice, tx.priceCurrency)}
        </Text>
      </View>
      <TouchableOpacity onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Editar operación" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 10 }}>
        <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '600' }}>Editar</Text>
      </TouchableOpacity>
    </View>
  )
}

function TransactionEditForm({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const confirm = useConfirm()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()

  // En el rediseño la fila de la operación solo tiene «Editar»: borrar una
  // operación suelta se hace desde acá, con la confirmación de siempre.
  const handleDelete = () => {
    void confirm({
      title: 'Eliminar operación',
      message: '¿Eliminar esta operación? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTx.mutateAsync(tx.id)
          toast('Operación eliminada')
          onClose()
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la operación.', 'error')
          throw err
        }
      },
    })
  }
  const [kind, setKind] = useState<'buy' | 'sell'>(tx.kind)
  const [quantity, setQuantity] = useState(String(tx.quantity))
  const [unitPrice, setUnitPrice] = useState(String(tx.unitPrice))
  const [priceCurrency, setPriceCurrency] = useState(tx.priceCurrency as PriceCurrency)
  const [fee, setFee] = useState(String(tx.fee))
  const [purchasedAt, setPurchasedAt] = useState(isoToDdmmyyyy(tx.purchasedAt))
  const [notes, setNotes] = useState(tx.notes ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    const input: UpdateTransactionInput = { kind }
    if (quantity.trim() !== '') input.quantity = parseFloat(quantity)
    if (unitPrice.trim() !== '') input.unitPrice = parseFloat(unitPrice)
    if (priceCurrency.trim() !== '') input.priceCurrency = priceCurrency
    if (fee.trim() !== '') input.fee = parseFloat(fee)
    if (notes.trim() !== '') input.notes = notes
    if (purchasedAt.trim() !== '') {
      const iso = ddmmyyyyToIso(purchasedAt)
      if (!iso) {
        setFormError('Ingresá una fecha válida (dd/mm/yyyy).')
        return
      }
      input.purchasedAt = iso
    }

    const parsed = updateTransactionInputSchema.safeParse(input)
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message ?? 'Datos inválidos.')
      return
    }
    setFormError(null)
    updateTx.mutate(
      { id: tx.id, input: parsed.data },
      {
        onSuccess: () => {
          toast('Transacción actualizada')
          onClose()
        },
        onError: (err) =>
          setFormError(err instanceof Error ? err.message : 'No se pudo actualizar la transacción.'),
      },
    )
  }

  return (
    <View style={[st.txRow, { backgroundColor: theme.background.surface, borderColor: theme.border.default, gap: 10 }]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant={kind === 'buy' ? 'primary' : 'secondary'} size="sm" onPress={() => setKind('buy')} style={{ flex: 1 }}>Compra</Button>
        <Button variant={kind === 'sell' ? 'primary' : 'secondary'} size="sm" onPress={() => setKind('sell')} style={{ flex: 1 }}>Venta</Button>
      </View>
      <FormField label="Cantidad" value={quantity} onChange={setQuantity} keyboard="numeric" />
      <FormField label="Precio unitario" value={unitPrice} onChange={setUnitPrice} keyboard="numeric" />
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text.secondary, fontSize: 13, fontWeight: '600' }}>Moneda del precio</Text>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: theme.background.muted, borderRadius: 10, padding: 4 }}>
          {PRICE_CURRENCIES.map((cur) => {
            const active = cur === priceCurrency
            return (
              <TouchableOpacity
                key={cur}
                onPress={() => setPriceCurrency(cur)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: active ? theme.brand.solid : 'transparent' }}
              >
                <Text style={{ color: active ? theme.text.onBrand : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{cur}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
      <FormField label="Comisión" value={fee} onChange={setFee} keyboard="numeric" />
      <FormField label="Fecha (dd/mm/yyyy)" value={purchasedAt} onChange={setPurchasedAt} />
      <FormField label="Notas" value={notes} onChange={setNotes} multiline />

      {formError ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{formError}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button size="sm" onPress={handleSave} disabled={updateTx.isPending} style={{ flex: 1 }}>
          {updateTx.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" size="sm" onPress={onClose} disabled={updateTx.isPending} style={{ flex: 1 }}>Cancelar</Button>
      </View>
      <TouchableOpacity onPress={handleDelete} disabled={deleteTx.isPending} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'center' }}>
        <Text style={{ color: theme.trend.neg, fontSize: 13, fontWeight: '600' }}>Eliminar operación</Text>
      </TouchableOpacity>
    </View>
  )
}

const st = StyleSheet.create({
  opChip: { fontSize: 11.5, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  txRow: { borderWidth: 1, borderRadius: 12, padding: 12 },
})
