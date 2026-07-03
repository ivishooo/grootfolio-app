import { useState } from 'react'
import { ScrollView, View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { createTransactionInputSchema, type CreateTransactionInput } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Tabs } from '@/components/ui/Tabs'

const ASSET_TYPES = [
  { value: 'crypto', label: 'Cripto' },
  { value: 'stock', label: 'Acciones' },
  { value: 'bond', label: 'Bonos' },
  { value: 'currency', label: 'Divisas' },
]

type AssetType = CreateTransactionInput['type']

export function AddAssetScreen() {
  const { theme } = useTheme()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createTx = useCreateTransaction()

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleSubmit = () => {
    const parsed = {
      symbol: form.symbol,
      type: activeType,
      kind,
      quantity: parseFloat(form.quantity) || 0,
      unitPrice: parseFloat(form.unitPrice) || 0,
      fee: form.fee ? parseFloat(form.fee) : 0,
      purchasedAt: form.purchasedAt ? new Date(form.purchasedAt).toISOString() : '',
      notes: form.notes || undefined,
    }
    const result = createTransactionInputSchema.safeParse(parsed)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])))
      return
    }
    setErrors({})
    createTx.mutate(result.data, {
      onSuccess: () => {
        Alert.alert('Exito', 'Transaccion guardada correctamente')
        setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
      },
      onError: (err) => {
        Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar la transaccion.')
      },
    })
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Cargar Activo</Text>

          <Tabs items={ASSET_TYPES} selected={activeType} onChange={(v) => setActiveType(v as AssetType)} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              variant={kind === 'buy' ? 'primary' : 'secondary'}
              onPress={() => setKind('buy')}
              style={kind === 'buy' ? { backgroundColor: theme.success.solid, flex: 1 } : { flex: 1 }}
            >
              Compra
            </Button>
            <Button
              variant={kind === 'sell' ? 'primary' : 'secondary'}
              onPress={() => setKind('sell')}
              style={kind === 'sell' ? { backgroundColor: theme.danger.solid, flex: 1 } : { flex: 1 }}
            >
              Venta
            </Button>
          </View>

          <Card>
            <View style={{ gap: 12 }}>
              <FormField label="Nombre del activo" placeholder="Ej: Bitcoin, Apple Inc..." value={form.symbol} error={errors.symbol} onChange={(v) => updateField('symbol', v)} />
              <FormField label="Cantidad" placeholder="0.5" value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} keyboard="numeric" />
              <FormField label="Precio unitario (USD)" placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} keyboard="numeric" />
              <FormField label="Comision (USD)" placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} keyboard="numeric" />
              <FormField label="Fecha (dd/mm/yyyy)" placeholder="15/05/2026" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} />
              <FormField label="Notas" placeholder="Observaciones..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} multiline />
              <Button fullWidth onPress={handleSubmit} disabled={createTx.isPending}>
                {createTx.isPending ? 'Guardando…' : 'Guardar Activo'}
              </Button>
            </View>
          </Card>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  )
}
