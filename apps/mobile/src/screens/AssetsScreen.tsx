/**
 * Gestion de activos mobile (GF-249): espejo del AssetsPage de web. Lista los
 * holdings del portfolio, permite expandir cada uno para ver sus transacciones,
 * editarlas/eliminarlas o borrar toda la posicion. Confirmaciones via Alert.
 */
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  assetTypeLabel,
  formatCurrency,
  formatPercent,
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
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { EmptyState, ErrorState } from '@/components/ui/States'

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
  const deletePosition = useDeleteAssetPosition()
  const { toast } = useToast()

  const handleDeletePosition = (holding: Holding) => {
    Alert.alert('Eliminar posición', `¿Eliminar toda la posición de ${holding.asset.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          deletePosition.mutate(holding.assetId, {
            onSuccess: () => toast('Posición eliminada'),
            onError: (err) =>
              toast(err instanceof Error ? err.message : 'No se pudo eliminar la posición.', 'error'),
          }),
      },
    ])
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Activos</Text>
          <Button size="sm" onPress={() => navigation.navigate('AddAsset')}>Cargar activo</Button>
        </View>

        {isLoading ? (
          <Text style={{ color: theme.text.muted }}>Cargando activos…</Text>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'No se pudo cargar el portfolio.'}
            onRetry={() => void refetch()}
          />
        ) : !p || p.holdings.length === 0 ? (
          <Card>
            <View style={{ gap: 12 }}>
              <EmptyState
                title="Todavía no tenés activos"
                description="Cargá tu primera transacción para empezar a ver tu portafolio."
              />
              <Button fullWidth onPress={() => navigation.navigate('AddAsset')}>Cargar activo</Button>
            </View>
          </Card>
        ) : (
          p.holdings.map((h) => (
            <HoldingCard
              key={h.assetId}
              holding={h}
              transactions={(transactions ?? []).filter((tx) => tx.assetId === h.assetId)}
              expanded={expanded === h.assetId}
              onToggle={() => setExpanded((cur) => (cur === h.assetId ? null : h.assetId))}
              onDeletePosition={() => handleDeletePosition(h)}
              deleting={deletePosition.isPending}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  )
}

interface HoldingCardProps {
  holding: Holding
  transactions: Transaction[]
  expanded: boolean
  onToggle: () => void
  onDeletePosition: () => void
  deleting: boolean
}

function HoldingCard({ holding, transactions, expanded, onToggle, onDeletePosition, deleting }: HoldingCardProps) {
  const { theme } = useTheme()

  return (
    <Card>
      <TouchableOpacity onPress={onToggle} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: theme.text.muted }}>{expanded ? '▾' : '▸'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{holding.asset.name}</Text>
          <Text style={{ color: theme.text.muted, fontSize: 12 }}>
            {assetTypeLabel[holding.asset.type as AssetType] ?? holding.asset.type} · {holding.quantity} unidades
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{formatCurrency(holding.value)}</Text>
          <Text style={{ color: holding.pnlPercent >= 0 ? theme.chart.positive : theme.chart.negative, fontSize: 12 }}>
            {formatPercent(holding.pnlPercent)}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: theme.border.default, paddingTop: 12 }}>
          {transactions.length === 0 ? (
            <Text style={{ color: theme.text.muted, fontSize: 13 }}>Sin transacciones para este activo.</Text>
          ) : (
            transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          )}
          <Button variant="destructive" size="sm" onPress={onDeletePosition} disabled={deleting}>
            Eliminar posición
          </Button>
        </View>
      )}
    </Card>
  )
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const deleteTx = useDeleteTransaction()

  const handleDelete = () => {
    Alert.alert('Eliminar transacción', '¿Eliminar esta transacción?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          deleteTx.mutate(tx.id, {
            onSuccess: () => toast('Transacción eliminada'),
            onError: (err) =>
              toast(err instanceof Error ? err.message : 'No se pudo eliminar la transacción.', 'error'),
          }),
      },
    ])
  }

  if (editing) {
    return <TransactionEditForm tx={tx} onClose={() => setEditing(false)} />
  }

  return (
    <View style={{ backgroundColor: theme.background.muted, borderRadius: 10, padding: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Text style={{ color: tx.kind === 'buy' ? theme.chart.positive : theme.chart.negative, fontWeight: '600' }}>
          {tx.kind === 'buy' ? 'Compra' : 'Venta'}
        </Text>
        <Text style={{ color: theme.text.primary }}>{tx.quantity} u.</Text>
        <Text style={{ color: theme.text.primary }}>{tx.unitPrice} {tx.priceCurrency}</Text>
        <Text style={{ color: theme.text.muted, fontSize: 12 }}>Com: {tx.fee}</Text>
        <Text style={{ color: theme.text.muted, fontSize: 12 }}>{isoToDdmmyyyy(tx.purchasedAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
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
    <View style={{ backgroundColor: theme.background.muted, borderRadius: 10, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant={kind === 'buy' ? 'primary' : 'secondary'} size="sm" onPress={() => setKind('buy')} style={{ flex: 1 }}>Compra</Button>
        <Button variant={kind === 'sell' ? 'primary' : 'secondary'} size="sm" onPress={() => setKind('sell')} style={{ flex: 1 }}>Venta</Button>
      </View>
      <FormField label="Cantidad" value={quantity} onChange={setQuantity} keyboard="numeric" />
      <FormField label="Precio unitario" value={unitPrice} onChange={setUnitPrice} keyboard="numeric" />
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text.secondary, fontSize: 13, fontWeight: '600' }}>Moneda del precio</Text>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: theme.background.surface, borderRadius: 10, padding: 4 }}>
          {PRICE_CURRENCIES.map((c) => {
            const active = c === priceCurrency
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setPriceCurrency(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: active ? theme.brand.solid : 'transparent' }}
              >
                <Text style={{ color: active ? theme.text.onBrand : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{c}</Text>
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
