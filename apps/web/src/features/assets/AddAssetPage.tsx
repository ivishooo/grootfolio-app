import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTransactionInputSchema, assetTypeLabels, type CreateTransactionInput } from '@grootfolio/shared'
import type { AssetSearchResult } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { AssetAutocomplete } from '@/components/ui/AssetAutocomplete'
import { Tabs } from '@/components/ui/Tabs'

const ASSET_TYPES = [
  { value: 'crypto', label: assetTypeLabels.crypto, icon: '₿' },
  { value: 'stock', label: assetTypeLabels.stock, icon: '↗' },
  { value: 'bond', label: assetTypeLabels.bond, icon: '🏛' },
  { value: 'currency', label: assetTypeLabels.currency, icon: '$' },
]

type AssetType = CreateTransactionInput['type']

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

// Configuración del formulario por tipo de activo: labels, si se elige la moneda
// del precio, y ayuda contextual.
const TYPE_FORM: Record<AssetType, {
  symbolLabel: string
  symbolPlaceholder: string
  qtyLabel: string
  qtyPlaceholder: string
  priceLabel: string
  showCurrency: boolean
  help?: string
}> = {
  crypto: { symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: Bitcoin, Ethereum...', qtyLabel: 'Cantidad', qtyPlaceholder: '0.5', priceLabel: 'Precio unitario (USD)', showCurrency: false },
  stock: { symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: Apple, GGAL.BA...', qtyLabel: 'Cantidad', qtyPlaceholder: '10', priceLabel: 'Precio unitario', showCurrency: true, help: 'Elegí la moneda del precio (ej. ARS para acciones .BA).' },
  bond: { symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: US-T, AL30...', qtyLabel: 'Cantidad', qtyPlaceholder: '10', priceLabel: 'Precio unitario', showCurrency: true, help: 'Los bonos aún no tienen precio en vivo (valuación manual).' },
  currency: { symbolLabel: 'Moneda que compraste', symbolPlaceholder: 'Ej: USD, EUR', qtyLabel: 'Cantidad comprada', qtyPlaceholder: '50', priceLabel: 'Precio pagado por unidad', showCurrency: true, help: 'Ej: compraste 50 USD pagando 1450 ARS cada uno.' },
}

const emptyForm = { symbol: '', quantity: '', unitPrice: '', fee: '', priceCurrency: 'USD', purchasedAt: '', notes: '' }

export function AddAssetPage() {
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ ...emptyForm })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createTx = useCreateTransaction()
  const { toast } = useToast()

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
    setSubmitError(null)
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
    setSubmitError(null)
    createTx.mutate(result.data, {
      onSuccess: () => {
        setForm({ ...emptyForm })
        toast('Activo cargado correctamente')
        navigate('/dashboard')
      },
      onError: (err) => {
        setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la transacción.')
      },
    })
  }

  // Al elegir del autocomplete: fija el symbol, bloquea el tipo al del activo y,
  // para tipos con moneda de precio, propone la moneda del catalogo si es una
  // de las soportadas (ej. ARS para acciones .BA).
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
    setSubmitError(null)
  }

  const handleCancel = () => {
    setForm({ ...emptyForm })
    setErrors({})
    navigate('/dashboard')
  }

  const cfg = TYPE_FORM[activeType]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Cargar Activo</h2>

      <Tabs items={ASSET_TYPES} selected={activeType} onChange={(v) => setActiveType(v as AssetType)} />

      <div className="flex gap-2">
        <Button variant={kind === 'buy' ? 'primary' : 'secondary'} fullWidth onClick={() => setKind('buy')} className={kind === 'buy' ? '!bg-success-500 hover:!bg-success-600' : ''}>Compra</Button>
        <Button variant={kind === 'sell' ? 'primary' : 'secondary'} fullWidth onClick={() => setKind('sell')} className={kind === 'sell' ? '!bg-danger-500 hover:!bg-danger-600' : ''}>Venta</Button>
      </div>

      <Card padding="lg">
        <div className="space-y-4">
          <AssetAutocomplete label={cfg.symbolLabel} placeholder={cfg.symbolPlaceholder} value={form.symbol} error={errors.symbol} type={activeType} onChange={(v) => updateField('symbol', v)} onSelect={handleSelectAsset} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={cfg.qtyLabel} placeholder={cfg.qtyPlaceholder} value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} type="number" />
            {cfg.showCurrency ? (
              <div className="text-sm">
                <label htmlFor="unitPrice" className="mb-1 block font-medium">{cfg.priceLabel}</label>
                <div className="flex gap-2">
                  <input
                    id="unitPrice"
                    type="number"
                    placeholder="0"
                    value={form.unitPrice}
                    onChange={(e) => updateField('unitPrice', e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <select
                    value={form.priceCurrency}
                    onChange={(e) => updateField('priceCurrency', e.target.value)}
                    aria-label="Moneda del precio"
                    className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {PRICE_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {(errors.unitPrice || errors.priceCurrency) && (
                  <p className="mt-1 text-xs text-danger-500">{errors.unitPrice || errors.priceCurrency}</p>
                )}
              </div>
            ) : (
              <Input label={cfg.priceLabel} placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} type="number" />
            )}
          </div>
          {cfg.help && <p className="text-xs text-neutral-500">{cfg.help}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={cfg.showCurrency ? `Comisión (${form.priceCurrency})` : 'Comisión (USD)'} placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} type="number" />
            <Input label="Fecha de compra" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} type="date" />
          </div>
          <Input label="Notas (opcional)" placeholder="Observaciones..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} multiline />

          {submitError && <p className="text-danger-500 text-sm font-medium">{submitError}</p>}

          <div className="flex gap-3 pt-2">
            <Button fullWidth onClick={handleSubmit} disabled={createTx.isPending}>
              {createTx.isPending ? 'Guardando…' : 'Guardar Activo'}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={createTx.isPending}>Cancelar</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
