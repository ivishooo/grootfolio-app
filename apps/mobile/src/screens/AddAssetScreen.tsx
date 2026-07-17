import { useState } from 'react'
import { ScrollView, View, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { createTransactionInputSchema, assetTypeLabels, type AssetSearchResult, type CreateTransactionInput } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AssetAutocomplete } from '@/components/ui/AssetAutocomplete'
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

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

const TYPE_FORM: Record<AssetType, { symbolLabel: string; qtyLabel: string; priceLabel: string; showCurrency: boolean; help?: string }> = {
  crypto: { symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario (USD)', showCurrency: false },
  stock: { symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario', showCurrency: true, help: 'Elegí la moneda del precio (ej. ARS para acciones .BA).' },
  bond: { symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario', showCurrency: true, help: 'Los bonos aún no tienen precio en vivo (valuación manual).' },
  currency: { symbolLabel: 'Moneda que compraste', qtyLabel: 'Cantidad comprada', priceLabel: 'Precio pagado por unidad', showCurrency: true, help: 'Ej: compraste 50 USD pagando 1450 ARS cada uno.' },
}

const emptyForm = { symbol: '', quantity: '', unitPrice: '', fee: '', priceCurrency: 'USD', purchasedAt: '', notes: '' }

export function AddAssetScreen() {
  const { theme } = useTheme()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ ...emptyForm })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createTx = useCreateTransaction()
  const cfg = TYPE_FORM[activeType]

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  // Al elegir del autocomplete: fija el symbol, bloquea el tipo al del activo y,
  // para tipos con moneda de precio, propone la del catalogo si es soportada
  // (ej. ARS para acciones .BA).
  const handleSelectAsset = (r: AssetSearchResult) => {
    setActiveType(r.type)
    setForm((p) => ({
      ...p,
      symbol: r.symbol,
      priceCurrency: TYPE_FORM[r.type].showCurrency && (PRICE_CURRENCIES as readonly string[]).includes(r.currency)
        ? r.currency
        : p.priceCurrency,
    }))
    setErrors((p) => ({ ...p, symbol: '' }))
  }

  const handleSubmit = () => {
    // En divisas, la moneda con la que pagás no puede ser la que comprás.
    if (activeType === 'currency' && form.priceCurrency.toUpperCase() === form.symbol.trim().toUpperCase()) {
      setErrors({ priceCurrency: 'La moneda con la que pagás no puede ser la misma que comprás.' })
      return
    }
    const parsed = {
      symbol: form.symbol,
      type: activeType,
      kind,
      quantity: parseFloat(form.quantity) || 0,
      unitPrice: parseFloat(form.unitPrice) || 0,
      fee: form.fee ? parseFloat(form.fee) : 0,
      priceCurrency: form.priceCurrency,
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
        setForm({ ...emptyForm })
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
              <AssetAutocomplete label={cfg.symbolLabel} placeholder="Ej: Bitcoin, Apple Inc..." value={form.symbol} error={errors.symbol} type={activeType} onChange={(v) => updateField('symbol', v)} onSelect={handleSelectAsset} />
              <FormField label={cfg.qtyLabel} placeholder="0.5" value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} keyboard="numeric" />
              <FormField label={cfg.priceLabel} placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} keyboard="numeric" />
              {cfg.showCurrency && (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.text.secondary, fontSize: 13, fontWeight: '600' }}>Moneda del precio</Text>
                  <View style={{ flexDirection: 'row', gap: 8, backgroundColor: theme.background.muted, borderRadius: 10, padding: 4 }}>
                    {PRICE_CURRENCIES.map((c) => {
                      const active = c === form.priceCurrency
                      return (
                        <TouchableOpacity
                          key={c}
                          onPress={() => updateField('priceCurrency', c)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: active ? theme.brand.solid : 'transparent' }}
                        >
                          <Text style={{ color: active ? theme.text.onBrand : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{c}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                  {errors.priceCurrency ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{errors.priceCurrency}</Text> : null}
                  {cfg.help ? <Text style={{ color: theme.text.secondary, fontSize: 12 }}>{cfg.help}</Text> : null}
                </View>
              )}
              <FormField label={cfg.showCurrency ? `Comisión (${form.priceCurrency})` : 'Comisión (USD)'} placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} keyboard="numeric" />
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
