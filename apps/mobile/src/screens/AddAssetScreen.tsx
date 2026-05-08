import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { createTransactionInputSchema, type CreateTransactionInput } from '@grootfolio/shared'

const ASSET_TYPES = [
  { value: 'crypto' as const, label: 'Cripto' },
  { value: 'stock' as const, label: 'Acciones' },
  { value: 'bond' as const, label: 'Bonos' },
  { value: 'currency' as const, label: 'Divisas' },
]

type AssetType = CreateTransactionInput['type']

export function AddAssetScreen() {
  const { theme } = useTheme()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    // eslint-disable-next-line no-console
    console.log('Mock submit:', result.data)
    Alert.alert('Exito', 'Activo guardado correctamente (mock)')
    setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Cargar Activo</Text>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ASSET_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setActiveType(t.value)}
                style={[s.tab, {
                  borderColor: activeType === t.value ? theme.brand.solid : theme.border.default,
                  backgroundColor: activeType === t.value ? theme.brand.subtle : theme.background.surface,
                  flex: 1,
                }]}
              >
                <Text style={{ color: activeType === t.value ? theme.brand.solid : theme.text.primary, textAlign: 'center', fontWeight: '600', fontSize: 13 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Kind toggle */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setKind('buy')}
              style={[s.kindBtn, { backgroundColor: kind === 'buy' ? theme.success.solid : theme.background.surface, borderColor: theme.border.default, borderWidth: kind === 'buy' ? 0 : 1 }]}
            >
              <Text style={{ color: kind === 'buy' ? theme.text.onBrand : theme.text.primary, fontWeight: '600' }}>Compra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setKind('sell')}
              style={[s.kindBtn, { backgroundColor: kind === 'sell' ? theme.danger.solid : theme.background.surface, borderColor: theme.border.default, borderWidth: kind === 'sell' ? 0 : 1 }]}
            >
              <Text style={{ color: kind === 'sell' ? theme.text.onBrand : theme.text.primary, fontWeight: '600' }}>Venta</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={[s.card, { borderColor: theme.border.default, backgroundColor: theme.background.surface }]}>
            <FormField label="Nombre del activo" placeholder="Ej: Bitcoin, Apple Inc..." value={form.symbol} error={errors.symbol} onChange={(v) => updateField('symbol', v)} theme={theme} />
            <FormField label="Cantidad" placeholder="0.5" value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} theme={theme} keyboard="numeric" />
            <FormField label="Precio unitario (USD)" placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} theme={theme} keyboard="numeric" />
            <FormField label="Comision (USD)" placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} theme={theme} keyboard="numeric" />
            <FormField label="Fecha (dd/mm/yyyy)" placeholder="15/05/2026" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} theme={theme} />
            <FormField label="Notas" placeholder="Observaciones..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} theme={theme} multiline />

            <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.brand.solid }]} onPress={handleSubmit}>
              <Text style={{ color: theme.text.onBrand, fontWeight: '600' }}>Guardar Activo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

function FormField({ label, placeholder, value, error, onChange, theme, keyboard, multiline }: {
  label: string; placeholder?: string; value: string; error?: string
  onChange: (v: string) => void; theme: any; keyboard?: string; multiline?: boolean
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.text.placeholder}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard as any}
        multiline={multiline}
        style={[s.input, {
          backgroundColor: theme.background.muted,
          color: theme.text.primary,
          borderColor: error ? theme.danger.solid : 'transparent',
          borderWidth: 1,
          height: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }]}
      />
      {error ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  tab: { padding: 12, borderWidth: 1, borderRadius: 14 },
  kindBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 12 },
  input: { padding: 12, borderRadius: 10 },
  submitBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
})
