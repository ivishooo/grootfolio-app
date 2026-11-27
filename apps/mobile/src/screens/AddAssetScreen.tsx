/**
 * Cargar activo en mobile (rediseño v2, Fase 4). Espejo de la web: tres pasos en
 * una tarjeta (¿qué activo? → ¿compraste o vendiste? → cantidad y precio) y el
 * resumen fijo abajo con el total y el botón. Prefill desde Activos con
 * `navigate('AddAsset', { symbol, kind })`. Se mantienen las validaciones: Zod,
 * TX_CURRENCY_MISMATCH y CEDEAR con .BA.
 */
import { useEffect, useState } from 'react'
import { ScrollView, View, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useGroot } from '@/components/groot/GrootProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { assetTypeLabel, createTransactionInputSchema, formatCurrency, formatQuantity, type AssetSearchResult, type CreateTransactionInput } from '@grootfolio/shared'
import { useCreateTransaction, usePortfolio } from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { Screen } from '@/components/ui/Screen'
import { FormField } from '@/components/ui/FormField'
import { AssetAutocomplete } from '@/components/ui/AssetAutocomplete'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { useToast } from '@/components/ui/ToastProvider'
import { assetColor } from '@/lib/asset-visual'

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

/** Hoy en dd/mm/yyyy, para el default del campo de fecha. */
function todayDdmmyyyy(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const
const TYPE_ORDER: AssetType[] = ['crypto', 'stock', 'bond', 'currency']
const TYPE_FORM: Record<AssetType, { label: string; symbolLabel: string; qtyLabel: string; priceLabel: string; showCurrency: boolean; help?: string }> = {
  crypto: { label: 'Cripto', symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario (USD)', showCurrency: false },
  stock: { label: 'Acciones', symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario', showCurrency: true, help: 'Si compraste un CEDEAR, elegí el ticker terminado en .BA y cargá el precio en pesos. Las acciones de EE. UU. van en dólares.' },
  bond: { label: 'Bonos', symbolLabel: 'Nombre del activo', qtyLabel: 'Cantidad', priceLabel: 'Precio unitario', showCurrency: true, help: 'Los bonos aún no tienen precio en vivo (valuación manual).' },
  currency: { label: 'Divisas', symbolLabel: 'Moneda que compraste', qtyLabel: 'Cantidad comprada', priceLabel: 'Precio pagado por unidad', showCurrency: true, help: 'Ej: compraste 50 USD pagando 1450 ARS cada uno.' },
}

const emptyForm = () => ({ symbol: '', quantity: '', unitPrice: '', fee: '', priceCurrency: 'USD', purchasedAt: todayDdmmyyyy(), notes: '' })

type Selected = { symbol: string; name: string; type: AssetType; currency: string }

export function AddAssetScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<RootStackParamList, 'AddAsset'>>()
  const groot = useGroot()
  const { toast } = useToast()
  const { data: portfolio } = usePortfolio()
  const [filterType, setFilterType] = useState<AssetType | undefined>(undefined)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [kind, setKind] = useState<'buy' | 'sell'>(route.params?.kind === 'sell' ? 'sell' : 'buy')
  const [form, setForm] = useState(emptyForm)
  const [showNotes, setShowNotes] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createTx = useCreateTransaction()

  // Prefill desde Activos («+ Comprar más» / «Vender»).
  const prefill = route.params?.symbol
  useEffect(() => {
    if (!prefill || selected || !portfolio) return
    const h = portfolio.holdings.find((x) => x.asset.symbol.toUpperCase() === prefill.toUpperCase())
    if (!h) return
    const sel = { symbol: h.asset.symbol, name: h.asset.name, type: h.asset.type as AssetType, currency: h.asset.symbol.toUpperCase().endsWith('.BA') ? 'ARS' : 'USD' }
    setSelected(sel)
    setForm((p) => ({ ...p, symbol: sel.symbol, priceCurrency: TYPE_FORM[sel.type].showCurrency ? sel.currency : 'USD' }))
  }, [prefill, selected, portfolio])

  const type: AssetType = selected?.type ?? filterType ?? 'crypto'
  const cfg = TYPE_FORM[type]
  const c = assetColor(type)
  const holding = portfolio?.holdings.find((h) => h.asset.symbol.toUpperCase() === (selected?.symbol ?? form.symbol).trim().toUpperCase())

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleSelectAsset = (r: AssetSearchResult) => {
    setSelected({ symbol: r.symbol, name: r.name, type: r.type, currency: r.currency })
    setForm((p) => ({
      ...p,
      symbol: r.symbol,
      priceCurrency: TYPE_FORM[r.type].showCurrency && (PRICE_CURRENCIES as readonly string[]).includes(r.currency) ? r.currency : 'USD',
    }))
    setErrors((p) => ({ ...p, symbol: '' }))
  }

  const handleSubmit = () => {
    if (type === 'currency' && form.priceCurrency.toUpperCase() === form.symbol.trim().toUpperCase()) {
      setErrors({ priceCurrency: 'La moneda con la que pagás no puede ser la misma que comprás.' })
      return
    }
    // Espejo de la regla del backend (TX_CURRENCY_MISMATCH). Una acción de
    // Nasdaq no tiene precio en pesos: si pagaste en pesos compraste el CEDEAR,
    // y anotarlo contra el ticker del subyacente daba rentabilidades de +4.000%.
    if (
      type === 'stock' &&
      form.priceCurrency.toUpperCase() === 'ARS' &&
      !form.symbol.trim().toUpperCase().endsWith('.BA')
    ) {
      setErrors({
        priceCurrency:
          'Las acciones de EE. UU. cotizan en dólares. Si compraste el CEDEAR en pesos, buscá el ticker terminado en .BA.',
      })
      return
    }
    const parsed = {
      symbol: form.symbol,
      type: type,
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
        setForm(emptyForm())
        toast(kind === 'buy' ? 'Compra guardada' : 'Venta guardada', 'success', { description: 'Ya la ves en tu portafolio.' })
        groot.decir('cargado', {
          morder: true,
          lastTx: { qty: result.data.quantity.toLocaleString('es-AR', { maximumFractionDigits: 8 }), symbol: result.data.symbol },
        })
        navigation.navigate('Main')
      },
      onError: (err) => {
        Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar la transacción.')
      },
    })
  }

  const cur = cfg.showCurrency ? form.priceCurrency : 'USD'
  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.unitPrice) || 0
  const feeNum = parseFloat(form.fee) || 0
  const total = kind === 'buy' ? qty * price + feeNum : qty * price - feeNum
  const fmt = (n: number) => formatCurrency(n, cur)
  const chosen = selected !== null || form.symbol.trim() !== ''
  const ready = chosen && qty > 0 && price > 0
  const todayPrice = holding && holding.currentPrice > 0 && cur === 'USD' ? holding.currentPrice : null
  const sym = selected?.symbol ?? form.symbol.trim().toUpperCase()

  const stepDot = (n: number, state: 'current' | 'done' | 'pending') => (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: state === 'current' ? theme.brand.solid : state === 'done' ? theme.trend.pos : theme.background.muted,
      }}
    >
      <Text style={{ color: state === 'pending' ? theme.text.muted : '#fff', fontSize: 12, fontWeight: '600' }}>{state === 'done' ? '✓' : n}</Text>
    </View>
  )
  const section = { padding: 16, borderTopWidth: 1, borderTopColor: theme.border.default, gap: 12 } as const
  const title = { color: theme.text.primary, fontSize: 15, fontWeight: '600' } as const

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen safeTop>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <View>
            <TouchableOpacity testID="addasset-volver" onPress={() => navigation.goBack()} hitSlop={10} style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '600' }}>← Volver</Text>
            </TouchableOpacity>
            <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 }}>Cargar activo</Text>
            <Text style={{ color: theme.text.secondary, fontSize: 13.5, marginTop: 2 }}>Registrá una compra o una venta en tres pasos.</Text>
          </View>

          <View style={{ backgroundColor: theme.background.surface, borderColor: theme.border.default, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
            {/* 1 · ¿Qué activo? */}
            <View style={[section, { borderTopWidth: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {stepDot(1, chosen ? 'done' : 'current')}
                <Text style={title}>¿Qué activo?</Text>
              </View>
              {selected ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: c.accent, backgroundColor: c.soft, borderRadius: 12, padding: 12 }}>
                  <AssetAvatar asset={{ symbol: selected.symbol, name: selected.name, type: selected.type, iconUrl: holding?.asset.iconUrl }} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 14, fontWeight: '600' }}>{selected.name}</Text>
                    <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
                      {selected.symbol} · {assetTypeLabel[selected.type]}
                      {todayPrice !== null ? ` · hoy ${formatCurrency(todayPrice, 'USD')}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    testID="addasset-cambiar"
                    onPress={() => {
                      setSelected(null)
                      updateField('symbol', '')
                    }}
                    style={{ height: 36, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border.strong, backgroundColor: theme.background.surface, justifyContent: 'center' }}
                  >
                    <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {TYPE_ORDER.map((t) => {
                      const on = filterType === t
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setFilterType(on ? undefined : t)}
                          accessibilityState={{ selected: on }}
                          style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, justifyContent: 'center', borderColor: on ? theme.text.primary : theme.border.default, backgroundColor: on ? theme.text.primary : theme.background.surface }}
                        >
                          <Text style={{ color: on ? theme.background.surface : theme.text.primary, fontSize: 13, fontWeight: '600' }}>{assetTypeLabel[t]}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                  <AssetAutocomplete
                    label="Nombre o ticker"
                    value={form.symbol}
                    onChange={(v) => updateField('symbol', v)}
                    onSelect={handleSelectAsset}
                    type={filterType}
                    placeholder="Bitcoin, AAPL, AL30…"
                    error={errors.symbol}
                  />
                </>
              )}
              {cfg.help && chosen ? <Text style={{ color: theme.text.secondary, fontSize: 12.5 }}>{cfg.help}</Text> : null}
            </View>

            <View pointerEvents={chosen ? 'auto' : 'none'} style={{ opacity: chosen ? 1 : 0.45 }}>
              {/* 2 · ¿Compraste o vendiste? */}
              <View style={section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {stepDot(2, chosen ? 'done' : 'pending')}
                  <Text style={title}>¿Compraste o vendiste?</Text>
                </View>
                <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: theme.background.muted }}>
                  {(['buy', 'sell'] as const).map((k) => {
                    const on = kind === k
                    return (
                      <TouchableOpacity
                        key={k}
                        testID={`addasset-${k}`}
                        onPress={() => setKind(k)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        style={{ flex: 1, height: 42, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: on ? theme.background.surface : 'transparent' }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: k === 'buy' ? theme.trend.pos : theme.trend.neg }} />
                        <Text style={{ color: on ? theme.text.primary : theme.text.muted, fontSize: 14, fontWeight: '600' }}>{k === 'buy' ? 'Compra' : 'Venta'}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                {kind === 'sell' && chosen ? (
                  holding ? (
                    <Text style={{ color: theme.text.secondary, fontSize: 13 }}>
                      Tenés {formatQuantity(holding.quantity)} {holding.asset.symbol}.{' '}
                      <Text onPress={() => updateField('quantity', String(Number(holding.quantity.toFixed(8))))} style={{ color: theme.brand.ink, fontWeight: '600' }}>
                        Vender todo
                      </Text>
                    </Text>
                  ) : (
                    <Text style={{ color: theme.text.secondary, fontSize: 13 }}>No tenés {sym} cargado: no se puede vender lo que no compraste.</Text>
                  )
                ) : null}
              </View>

              {/* 3 · Cantidad y precio */}
              <View style={section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {stepDot(3, !chosen ? 'pending' : ready ? 'done' : 'current')}
                  <Text style={title}>Cantidad y precio</Text>
                </View>
                <FormField testID="addasset-cantidad" label={cfg.qtyLabel} placeholder="0" value={form.quantity} error={errors.quantity} keyboard="decimal-pad" onChange={(v) => updateField('quantity', v)} />
                <View style={{ gap: 6 }}>
                  <FormField
                    testID="addasset-precio"
                    label={`${kind === 'buy' ? 'Precio que pagaste' : 'Precio al que vendiste'} (${cur})`}
                    placeholder="0"
                    value={form.unitPrice}
                    error={errors.unitPrice || errors.priceCurrency}
                    keyboard="decimal-pad"
                    onChange={(v) => updateField('unitPrice', v)}
                  />
                  {cfg.showCurrency && (
                    <View style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: theme.background.muted }}>
                      {PRICE_CURRENCIES.map((m) => {
                        const on = form.priceCurrency === m
                        return (
                          <TouchableOpacity key={m} onPress={() => updateField('priceCurrency', m)} accessibilityState={{ selected: on }} style={{ flex: 1, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.background.surface : 'transparent' }}>
                            <Text style={{ color: on ? theme.text.primary : theme.text.muted, fontSize: 13, fontWeight: '600' }}>{m}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                  {todayPrice !== null && (
                    <Text style={{ color: theme.text.muted, fontSize: 12 }}>
                      Hoy cotiza {formatCurrency(todayPrice, 'USD')} ·{' '}
                      <Text onPress={() => updateField('unitPrice', String(todayPrice))} style={{ color: theme.brand.ink, fontWeight: '600' }}>Usar este</Text>
                    </Text>
                  )}
                </View>
                <FormField label={kind === 'buy' ? 'Fecha de compra (dd/mm/aaaa)' : 'Fecha de venta (dd/mm/aaaa)'} placeholder="15/05/2026" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} />
                <FormField label="Comisión · opcional" placeholder="0" value={form.fee} keyboard="decimal-pad" onChange={(v) => updateField('fee', v)} />
                {showNotes ? (
                  <FormField label="Nota · opcional" value={form.notes} multiline onChange={(v) => updateField('notes', v)} />
                ) : (
                  <TouchableOpacity onPress={() => setShowNotes(true)} style={{ minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' }}>
                    <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '600' }}>+ Agregar una nota</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Resumen fijo abajo: total y botón. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12 + insets.bottom,
            backgroundColor: theme.background.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border.default,
            shadowColor: '#0F172A',
            shadowOpacity: 0.1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -6 },
            elevation: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text.secondary, fontSize: 12.5 }}>{kind === 'buy' ? 'Total que pagaste' : 'Total que cobraste'}</Text>
            <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmt(total)}</Text>
          </View>
          <TouchableOpacity
            testID="addasset-guardar"
            onPress={handleSubmit}
            disabled={createTx.isPending}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || createTx.isPending }}
            style={{ height: 48, paddingHorizontal: 20, borderRadius: 11, backgroundColor: theme.brand.solid, justifyContent: 'center', opacity: ready ? 1 : 0.5 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
              {createTx.isPending ? 'Guardando…' : kind === 'buy' ? 'Guardar compra' : 'Guardar venta'}
            </Text>
          </TouchableOpacity>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}
