/**
 * Cargar activo mobile (rediseño GF) — espejo del AddAssetPage de web.
 * Selector de tipo en 4 tarjetas (ícono en círculo del color + label), toggle
 * Compra/Venta, formulario por tipo con autocomplete y panel de resumen en vivo
 * (avatar, operación, cantidad, precio, comisión, total estimado).
 * Conserva la lógica original: validación Zod, handleSelectAsset, ddmmyyyyToIso,
 * submit → toast + volver al dashboard.
 */
import { useState } from 'react'
import { ScrollView, View, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import { createTransactionInputSchema, type AssetSearchResult, type CreateTransactionInput } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AssetAutocomplete } from '@/components/ui/AssetAutocomplete'
import { useToast } from '@/components/ui/ToastProvider'
import { assetColor, assetMark } from '@/lib/asset-visual'
import { ASSISTANT_SAFE_BOTTOM } from '@/components/assistant/tokens'

type AssetType = CreateTransactionInput['type']

function ddmmyyyyToIso(input: string): string {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
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

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

const TYPE_ORDER: AssetType[] = ['crypto', 'stock', 'bond', 'currency']
const TYPE_MARK: Record<AssetType, string> = { crypto: '₿', stock: '↗', bond: '≣', currency: '$' }

const TYPE_FORM: Record<AssetType, { label: string; symbolLabel: string; qtyLabel: string; priceLabel: string; showCurrency: boolean; help?: string }> = {
  crypto: { label: 'Cripto', symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario (USD)', showCurrency: false },
  stock: { label: 'Acciones', symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario', showCurrency: true, help: 'Elegí la moneda del precio (ej. ARS para acciones .BA).' },
  bond: { label: 'Bonos', symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario', showCurrency: true, help: 'Los bonos aún no tienen precio en vivo (valuación manual).' },
  currency: { label: 'Divisas', symbolLabel: 'Moneda que compraste', qtyLabel: 'Cantidad comprada', priceLabel: 'Precio pagado por unidad', showCurrency: true, help: 'Ej: compraste 50 USD pagando 1450 ARS cada uno.' },
}

const emptyForm = { symbol: '', quantity: '', unitPrice: '', fee: '', priceCurrency: 'USD', purchasedAt: '', notes: '' }

export function AddAssetScreen() {
  const { theme } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { toast } = useToast()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ ...emptyForm })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createTx = useCreateTransaction()
  const cfg = TYPE_FORM[activeType]
  const c = assetColor(activeType)

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

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
      if (mapped.purchasedAt) mapped.purchasedAt = 'Ingresá una fecha válida (dd/mm/yyyy).'
      setErrors(mapped)
      return
    }
    setErrors({})
    createTx.mutate(result.data, {
      onSuccess: () => {
        setForm({ ...emptyForm })
        toast('Activo cargado', 'success', { description: 'Se sumó a tu portafolio.' })
        navigation.navigate('Main')
      },
      onError: (err) => {
        Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar la transacción.')
      },
    })
  }

  // Resumen en vivo.
  const cur = cfg.showCurrency ? form.priceCurrency : 'USD'
  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.unitPrice) || 0
  const feeNum = parseFloat(form.fee) || 0
  const total = qty * price + feeNum
  const fmt = (n: number) => `${cur === 'USD' ? 'US$ ' : cur + ' '}${(Math.round(n * 100) / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
  const previewMark = form.symbol ? assetMark({ symbol: form.symbol }) : TYPE_MARK[activeType]

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: ASSISTANT_SAFE_BOTTOM }} keyboardShouldPersistTaps="handled">
          <View>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={6}>
              <Text style={{ color: theme.text.secondary, fontSize: 13 }}>← Volver</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.text.primary, fontSize: 22, fontWeight: '800', marginTop: 6 }}>Cargar activo</Text>
            <Text style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }}>Registrá una compra o venta en tu portafolio.</Text>
          </View>

          {/* Tipo de activo — tarjetas */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.text.secondary, fontSize: 13, fontWeight: '600' }}>Tipo de activo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {TYPE_ORDER.map((type) => {
                const sel = activeType === type
                const tc = assetColor(type)
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setActiveType(type)
                      if (!TYPE_FORM[type].showCurrency) updateField('priceCurrency', 'USD')
                    }}
                    style={{
                      width: '47%',
                      flexGrow: 1,
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: sel ? tc.accent : theme.border.default,
                      backgroundColor: sel ? tc.soft : 'transparent',
                    }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: tc.accent, fontWeight: '800', fontSize: 16 }}>{TYPE_MARK[type]}</Text>
                    </View>
                    <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>{TYPE_FORM[type].label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Operación */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.text.secondary, fontSize: 13, fontWeight: '600' }}>Operación</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setKind('buy')}
                style={{ flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', borderColor: kind === 'buy' ? '#16A34A' : theme.border.default, backgroundColor: kind === 'buy' ? '#16A34A' : 'transparent' }}
              >
                <Text style={{ color: kind === 'buy' ? '#fff' : theme.text.primary, fontWeight: '700' }}>↓ Compra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setKind('sell')}
                style={{ flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', borderColor: kind === 'sell' ? '#DC2626' : theme.border.default, backgroundColor: kind === 'sell' ? '#DC2626' : 'transparent' }}
              >
                <Text style={{ color: kind === 'sell' ? '#fff' : theme.text.primary, fontWeight: '700' }}>↑ Venta</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Formulario */}
          <View style={{ gap: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 16 }}>
            <AssetAutocomplete label={cfg.symbolLabel} placeholder="Ej: Bitcoin, Apple Inc..." value={form.symbol} error={errors.symbol} type={activeType} onChange={(v) => updateField('symbol', v)} onSelect={handleSelectAsset} />
            <FormField label={cfg.qtyLabel} placeholder="0.5" value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} keyboard="numeric" />
            <FormField label={cfg.priceLabel} placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} keyboard="numeric" />
            {cfg.showCurrency && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: theme.text.secondary, fontSize: 13, fontWeight: '600' }}>Moneda del precio</Text>
                <View style={{ flexDirection: 'row', gap: 8, backgroundColor: theme.background.muted, borderRadius: 10, padding: 4 }}>
                  {PRICE_CURRENCIES.map((pc) => {
                    const active = pc === form.priceCurrency
                    return (
                      <TouchableOpacity key={pc} onPress={() => updateField('priceCurrency', pc)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: active ? theme.brand.solid : 'transparent' }}>
                        <Text style={{ color: active ? theme.text.onBrand : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{pc}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                {errors.priceCurrency ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{errors.priceCurrency}</Text> : null}
              </View>
            )}
            {cfg.help ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: c.soft, backgroundColor: c.soft, padding: 10 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontStyle: 'italic' }}>i</Text>
                </View>
                <Text style={{ color: theme.text.secondary, fontSize: 12, flex: 1 }}>{cfg.help}</Text>
              </View>
            ) : null}
            <FormField label={cfg.showCurrency ? `Comisión (${form.priceCurrency})` : 'Comisión (USD)'} placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} keyboard="numeric" />
            <FormField label="Fecha (dd/mm/yyyy)" placeholder="15/05/2026" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} />
            <FormField label="Notas" placeholder="Observaciones..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} multiline />
          </View>

          {/* Resumen en vivo */}
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 16 }}>
            <Text style={{ color: theme.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Resumen</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{previewMark}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{form.symbol || 'Nuevo activo'}</Text>
                <Text style={{ color: theme.text.secondary, fontSize: 12 }}>{cfg.label}</Text>
              </View>
            </View>
            <View style={{ marginTop: 14, gap: 8 }}>
              <SummaryRow label="Operación" value={kind === 'buy' ? 'Compra' : 'Venta'} valueColor={kind === 'buy' ? '#16A34A' : '#DC2626'} />
              <SummaryRow label="Cantidad" value={qty ? qty.toLocaleString('es-AR') : '—'} />
              <SummaryRow label="Precio unitario" value={price ? fmt(price) : '—'} />
              <SummaryRow label="Comisión" value={feeNum ? fmt(feeNum) : '—'} />
            </View>
            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border.default, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ color: theme.text.secondary, fontSize: 14, fontWeight: '600' }}>Total estimado</Text>
              <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '800' }}>{fmt(total)}</Text>
            </View>
          </View>

          {/* Acciones */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={createTx.isPending}
              style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, opacity: createTx.isPending ? 0.75 : 1 }}
            >
              {createTx.isPending ? <ActivityIndicator size="small" color={theme.text.onBrand} /> : null}
              <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>{createTx.isPending ? 'Guardando…' : 'Guardar activo'}</Text>
            </TouchableOpacity>
            <Button variant="secondary" onPress={() => navigation.goBack()} disabled={createTx.isPending}>Cancelar</Button>
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  )
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.text.secondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: valueColor ?? theme.text.primary, fontSize: 14, fontWeight: '600' }}>{value}</Text>
    </View>
  )
}
