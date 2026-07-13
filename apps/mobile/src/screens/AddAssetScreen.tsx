import { useState } from 'react'
import { ScrollView, View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { createTransactionInputSchema, assetTypeLabels, type CreateTransactionInput } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Tabs } from '@/components/ui/Tabs'

const ASSET_TYPES = [
  { value: 'crypto', label: assetTypeLabels.crypto },
  { value: 'stock', label: assetTypeLabels.stock },
  { value: 'bond', label: assetTypeLabels.bond },
  { value: 'currency', label: assetTypeLabels.currency },
]

type AssetType = CreateTransactionInput['type']

/**
 * Convierte una fecha "dd/mm/yyyy" (formato del campo) a ISO 8601, o devuelve
 * '' si el formato o la fecha son invalidos. NUNCA tira: reemplaza el uso de
 * `new Date(str).toISOString()`, que con un dd/mm/yyyy invalido (p. ej. dia > 12)
 * producia `Invalid Date` y `.toISOString()` lanzaba RangeError, crasheando la app.
 */
function ddmmyyyyToIso(input: string): string {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  // Rechaza desbordes (31/02, mes 13, etc.): el Date "normaliza" y no coincide.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return ''
  }
  return date.toISOString()
}

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
      purchasedAt: ddmmyyyyToIso(form.purchasedAt),
      notes: form.notes || undefined,
    }
    const result = createTransactionInputSchema.safeParse(parsed)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const mapped = Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? '']),
      )
      // El schema solo dice "Invalid datetime"; damos un mensaje mas claro.
      if (mapped.purchasedAt) mapped.purchasedAt = 'Ingresá una fecha válida (dd/mm/yyyy).'
      setErrors(mapped)
      return
    }
    setErrors({})
    createTx.mutate(result.data, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Transacción guardada correctamente')
        setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
      },
      onError: (err) => {
        Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar la transacción.')
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
              <FormField label="Comisión (USD)" placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} keyboard="numeric" />
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
