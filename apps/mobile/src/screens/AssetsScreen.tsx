/**
 * Gestión de activos mobile (rediseño GF) — espejo del AssetsPage de web.
 * Holdings con AssetAvatar, ticker (chip color), chip de tipo, avg→actual,
 * barra de % de cartera y P&L ($ y %). Expand a transacciones con editar/
 * eliminar. Confirmaciones con el ConfirmProvider (estado de carga) y toasts.
 */
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  assetTypeLabel,
  formatCurrency,
  formatPercent,
  formatShare,
  updateTransactionInputSchema,
} from '@grootfolio/shared'
import type { AssetType, Holding, Transaction, UpdateTransactionInput } from '@grootfolio/shared'
import {
  useDeleteAssetPosition,
  useDeleteTransaction,
  usePortfolio,
  useTransactions,
  useUpdateTransaction,
} from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { ASSISTANT_SAFE_BOTTOM } from '@/components/assistant/tokens'

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()
  const { data: transactions } = useTransactions()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bannerOpen, setBannerOpen] = useState(true)
  const deletePosition = useDeleteAssetPosition()
  const { toast } = useToast()
  const confirm = useConfirm()

  const total = p?.totalValue ?? 0

  const handleDeletePosition = (holding: Holding) => {
    void confirm({
      title: 'Eliminar posición',
      message: `¿Eliminar toda la posición de ${holding.asset.name}? Se borran todas sus transacciones. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar posición',
      onConfirm: async () => {
        try {
          await deletePosition.mutateAsync(holding.assetId)
          toast('Posición eliminada', 'info', { description: 'Se borraron todas sus transacciones.' })
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la posición.', 'error')
          throw err
        }
      },
    })
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: ASSISTANT_SAFE_BOTTOM }}>
        {bannerOpen && (
          <View style={[st.banner, { backgroundColor: 'rgba(37,99,235,0.10)', borderColor: 'rgba(37,99,235,0.35)' }]}>
            <Text style={{ color: theme.text.secondary, fontSize: 13, flex: 1 }}>
              Los precios de mercado se actualizan cada 15 minutos.
            </Text>
            <TouchableOpacity onPress={() => setBannerOpen(false)} hitSlop={8}>
              <Text style={{ color: theme.text.muted }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text testID="screen-activos-title" style={{ color: theme.text.primary, fontSize: 22, fontWeight: '800' }}>Activos</Text>
            {p && p.holdings.length > 0 ? (
              <Text style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }}>
                {p.holdings.length} posiciones · Valor total{' '}
                <Text style={{ color: theme.text.primary, fontWeight: '700' }}>{formatCurrency(total)}</Text>
              </Text>
            ) : null}
          </View>
          <Button testID="activos-cargar" size="sm" onPress={() => navigation.navigate('AddAsset')}>+ Cargar activo</Button>
        </View>

        {isLoading ? (
          <Text style={{ color: theme.text.muted }}>Cargando activos…</Text>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'No se pudo cargar el portfolio.'}
            onRetry={() => void refetch()}
          />
        ) : !p || p.holdings.length === 0 ? (
          <View style={[st.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
            <View style={{ gap: 12 }}>
              <EmptyState
                title="Todavía no tenés activos"
                description="Cargá tu primera transacción para empezar a ver tu portafolio."
              />
              <Button testID="activos-cargar-vacio" fullWidth onPress={() => navigation.navigate('AddAsset')}>Cargar activo</Button>
            </View>
          </View>
        ) : (
          p.holdings.map((h) => (
            <HoldingCard
              key={h.assetId}
              holding={h}
              total={total}
              transactions={(transactions ?? []).filter((tx) => tx.assetId === h.assetId)}
              expanded={expanded === h.assetId}
              onToggle={() => setExpanded((cur) => (cur === h.assetId ? null : h.assetId))}
              onDeletePosition={() => handleDeletePosition(h)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  )
}

interface HoldingCardProps {
  holding: Holding
  total: number
  transactions: Transaction[]
  expanded: boolean
  onToggle: () => void
  onDeletePosition: () => void
}

function HoldingCard({ holding, total, transactions, expanded, onToggle, onDeletePosition }: HoldingCardProps) {
  const { theme } = useTheme()
  const c = assetColor(holding.asset.type)
  const pct = total > 0 ? (holding.value / total) * 100 : 0
  // Cuando pnlPercent es null la rentabilidad no es calculable (sin base de
  // costo o sin cotizacion). Ni flecha ni color: un triangulo verde al lado de
  // "—" afirma que subio, que es justo lo que no sabemos.
  const known = holding.pnlPercent !== null
  const up = holding.pnl >= 0
  const pnlColor = !known ? theme.text.muted : up ? theme.chart.positive : theme.chart.negative

  return (
    <View style={[st.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default, padding: 0 }]}>
      <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
        <TouchableOpacity onPress={onToggle} hitSlop={6} style={{ paddingTop: 6 }}>
          <Text style={{ color: theme.text.muted, fontSize: 12 }}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        <AssetAvatar asset={holding.asset} size={44} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
              {holding.asset.name}
            </Text>
            <Text style={[st.chip, { color: c.accent, backgroundColor: c.soft }]}>{holding.asset.symbol}</Text>
            <Text style={[st.typeChip, { color: theme.text.muted, borderColor: theme.border.default }]}>
              {assetTypeLabel[holding.asset.type as AssetType] ?? holding.asset.type}
            </Text>
          </View>
          <Text style={{ color: theme.text.secondary, fontSize: 12, marginTop: 4 }}>
            {holding.quantity} u · Compra{' '}
            <Text style={{ color: theme.text.primary }}>{formatCurrency(holding.avgPrice)}</Text> → Actual{' '}
            <Text style={{ color: theme.text.primary }}>{formatCurrency(holding.currentPrice)}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.background.muted, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: c.accent, borderRadius: 3 }} />
            </View>
            <Text style={{ color: theme.text.muted, fontSize: 11, fontWeight: '600' }}>{formatShare(pct)}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.text.primary, fontSize: 16, fontWeight: '800' }}>{formatCurrency(holding.value)}</Text>
          <Text style={{ color: pnlColor, fontSize: 12, fontWeight: '700' }}>
            {known ? (up ? '▲ ' : '▼ ') : ''}{formatPercent(holding.pnlPercent)}
          </Text>
          <Text style={{ color: pnlColor, fontSize: 12 }}>{formatCurrency(holding.pnl)}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Button testID="holding-eliminar" variant="secondary" size="sm" onPress={onDeletePosition}>Eliminar posición</Button>
      </View>

      {expanded && (
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: theme.border.default, backgroundColor: theme.background.muted, padding: 16 }}>
          {transactions.length === 0 ? (
            <Text style={{ color: theme.text.muted, fontSize: 13 }}>Sin transacciones para este activo.</Text>
          ) : (
            transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          )}
        </View>
      )}
    </View>
  )
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const deleteTx = useDeleteTransaction()
  const isBuy = tx.kind === 'buy'
  const opColor = isBuy ? theme.chart.positive : theme.chart.negative

  const handleDelete = () => {
    void confirm({
      title: 'Eliminar transacción',
      message: '¿Eliminar esta transacción? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTx.mutateAsync(tx.id)
          toast('Transacción eliminada')
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la transacción.', 'error')
          throw err
        }
      },
    })
  }

  if (editing) {
    return <TransactionEditForm tx={tx} onClose={() => setEditing(false)} />
  }

  return (
    <View style={[st.txRow, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={[st.opChip, { color: opColor, backgroundColor: isBuy ? 'rgba(22,163,74,0.13)' : 'rgba(220,38,38,0.13)' }]}>
          {isBuy ? 'Compra' : 'Venta'}
        </Text>
        <Text style={{ color: theme.text.primary, fontSize: 13 }}>{tx.quantity} u</Text>
        <Text style={{ color: theme.text.primary, fontSize: 13 }}>{tx.unitPrice} {tx.priceCurrency}</Text>
        <Text style={{ color: theme.text.muted, fontSize: 12 }}>Com: {tx.fee}</Text>
        <Text style={{ color: theme.text.muted, fontSize: 12 }}>{isoToDdmmyyyy(tx.purchasedAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" size="sm" onPress={() => setEditing(true)} style={{ flex: 1 }}>Editar</Button>
        <Button variant="destructive" size="sm" onPress={handleDelete} disabled={deleteTx.isPending} style={{ flex: 1 }}>Eliminar</Button>
      </View>
    </View>
  )
}

function TransactionEditForm({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const updateTx = useUpdateTransaction()
  const [kind, setKind] = useState<'buy' | 'sell'>(tx.kind)
  const [quantity, setQuantity] = useState(String(tx.quantity))
  const [unitPrice, setUnitPrice] = useState(String(tx.unitPrice))
  const [priceCurrency, setPriceCurrency] = useState(tx.priceCurrency)
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
    </View>
  )
}

const st = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  typeChip: { fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, overflow: 'hidden' },
  txRow: { borderWidth: 1, borderRadius: 12, padding: 12 },
  opChip: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
})
