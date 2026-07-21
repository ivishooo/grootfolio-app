/**
 * Cargar activo (GF-249) — rediseño. Selector de tipo en tarjetas con color,
 * toggle compra/venta, formulario por tipo y panel de resumen en vivo.
 * Conserva la lógica original: validación con Zod, autocomplete, toast + redirect.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTransactionInputSchema } from '@grootfolio/shared'
import type { AssetSearchResult, AssetType } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import { Input } from '@/components/ui/Input'
import { AssetAutocomplete } from '@/components/ui/AssetAutocomplete'
import { assetColor, assetMark } from '@/lib/asset-visual'

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

const TYPE_FORM: Record<AssetType, {
  label: string
  symbolLabel: string
  symbolPlaceholder: string
  qtyLabel: string
  qtyPlaceholder: string
  priceLabel: string
  showCurrency: boolean
  help?: string
}> = {
  crypto: { label: 'Cripto', symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: Bitcoin, Ethereum...', qtyLabel: 'Cantidad', qtyPlaceholder: '0.5', priceLabel: 'Precio unitario (USD)', showCurrency: false },
  stock: { label: 'Acciones', symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: Apple, GGAL.BA...', qtyLabel: 'Cantidad', qtyPlaceholder: '10', priceLabel: 'Precio unitario', showCurrency: true, help: 'Elegí la moneda del precio (ej. ARS para acciones .BA).' },
  bond: { label: 'Bonos', symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: US-T, AL30...', qtyLabel: 'Cantidad', qtyPlaceholder: '10', priceLabel: 'Precio unitario', showCurrency: true, help: 'Los bonos aún no tienen precio en vivo (valuación manual).' },
  currency: { label: 'Divisas', symbolLabel: 'Moneda que compraste', symbolPlaceholder: 'Ej: USD, EUR', qtyLabel: 'Cantidad comprada', qtyPlaceholder: '50', priceLabel: 'Precio pagado por unidad', showCurrency: true, help: 'Ej: compraste 50 USD pagando 1450 ARS cada uno.' },
}

const TYPE_ORDER: AssetType[] = ['crypto', 'stock', 'bond', 'currency']

const emptyForm = { symbol: '', quantity: '', unitPrice: '', fee: '', priceCurrency: 'USD', purchasedAt: '', notes: '' }

function TypeIcon({ type }: { type: AssetType }) {
  const { accent } = assetColor(type)
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const inner =
    type === 'crypto' ? <span className="text-base font-bold">₿</span>
    : type === 'currency' ? <span className="text-[17px] font-bold">$</span>
    : type === 'stock' ? <svg {...common}><path d="M4 16l5-5 3 3 6-7" /><path d="M18 7h-4M18 7v4" /></svg>
    : <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
  return (
    <span className="grid h-[34px] w-[34px] place-items-center rounded-full" style={{ background: assetColor(type).soft, color: accent }}>
      {inner}
    </span>
  )
}

const fieldCls =
  'w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800'

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
        toast('Activo cargado', 'success', { description: 'Se sumó a tu portafolio.' })
        navigate('/dashboard')
      },
      onError: (err) => {
        setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la transacción.')
      },
    })
  }

  const handleSelectAsset = (r: AssetSearchResult) => {
    setActiveType(r.type)
    setForm((p) => ({
      ...p,
      symbol: r.symbol,
      priceCurrency:
        TYPE_FORM[r.type].showCurrency && (PRICE_CURRENCIES as readonly string[]).includes(r.currency)
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
  const c = assetColor(activeType)
  const cur = cfg.showCurrency ? form.priceCurrency : 'USD'
  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.unitPrice) || 0
  const fee = parseFloat(form.fee) || 0
  const total = qty * price + fee
  const fmt = (n: number) => `${cur === 'USD' ? 'US$ ' : cur + ' '}${(Math.round(n * 100) / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
  const previewMark = form.symbol
    ? assetMark({ symbol: form.symbol })
    : ({ crypto: '₿', stock: 'A', bond: 'B', currency: '$' } as Record<AssetType, string>)[activeType]

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <button onClick={() => navigate('/assets')} className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
          ← Volver a Activos
        </button>
        <h2 className="text-2xl font-bold">Cargar activo</h2>
        <p className="mt-1 text-sm text-neutral-500">Registrá una compra o venta en tu portafolio.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* FORM */}
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Tipo de activo</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {TYPE_ORDER.map((type) => {
                const sel = activeType === type
                const tc = assetColor(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setActiveType(type)
                      if (!TYPE_FORM[type].showCurrency) updateField('priceCurrency', 'USD')
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-neutral-200 p-3.5 transition-colors dark:border-neutral-800"
                    style={
                      sel
                        ? { borderColor: tc.accent, background: `color-mix(in srgb, ${tc.accent} 8%, transparent)` }
                        : undefined
                    }
                  >
                    <span className={sel ? '' : 'contents'}>
                      <TypeIcon type={type} />
                    </span>
                    <span className="text-[12.5px] font-semibold">{TYPE_FORM[type].label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Operación</p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setKind('buy')}
                className="flex-1 rounded-lg border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold transition-colors dark:border-neutral-700"
                style={kind === 'buy' ? { borderColor: '#16A34A', background: '#16A34A', color: '#fff' } : undefined}
              >
                ↓ Compra
              </button>
              <button
                type="button"
                onClick={() => setKind('sell')}
                className="flex-1 rounded-lg border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold transition-colors dark:border-neutral-700"
                style={kind === 'sell' ? { borderColor: '#DC2626', background: '#DC2626', color: '#fff' } : undefined}
              >
                ↑ Venta
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-[22px] dark:border-neutral-800 dark:bg-neutral-900">
            <AssetAutocomplete
              label={cfg.symbolLabel}
              placeholder={cfg.symbolPlaceholder}
              value={form.symbol}
              error={errors.symbol}
              type={activeType}
              onChange={(v) => updateField('symbol', v)}
              onSelect={handleSelectAsset}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={cfg.qtyLabel} placeholder={cfg.qtyPlaceholder} value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} type="number" />
              {cfg.showCurrency ? (
                <div className="text-sm">
                  <label htmlFor="unitPrice" className="mb-1 block font-medium">{cfg.priceLabel}</label>
                  <div className="flex gap-2">
                    <input id="unitPrice" type="number" placeholder="0" value={form.unitPrice} onChange={(e) => updateField('unitPrice', e.target.value)} className={fieldCls} />
                    <select value={form.priceCurrency} onChange={(e) => updateField('priceCurrency', e.target.value)} aria-label="Moneda del precio" className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                      {PRICE_CURRENCIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
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
            {cfg.help && (
              <div className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${c.accent} 22%, transparent)`, background: `color-mix(in srgb, ${c.accent} 9%, transparent)` }}>
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[11px] font-bold italic text-white" style={{ background: c.accent }}>i</span>
                <p className="text-[12.5px] leading-snug text-neutral-600 dark:text-neutral-300">{cfg.help}</p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={cfg.showCurrency ? `Comisión (${form.priceCurrency})` : 'Comisión (USD)'} placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} type="number" />
              <Input label="Fecha de compra" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} type="date" />
            </div>
            <Input label="Notas (opcional)" placeholder="Observaciones..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} multiline />

            {submitError && <p className="text-sm font-medium text-danger-500">{submitError}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createTx.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {createTx.isPending && (
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" style={{ animation: 'gf-spin .6s linear infinite' }} />
              )}
              {createTx.isPending ? 'Guardando…' : 'Guardar activo'}
            </button>
            <button type="button" onClick={handleCancel} disabled={createTx.isPending} className="rounded-xl border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Cancelar
            </button>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 lg:sticky lg:top-20 lg:self-start">
          <p className="mb-3.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">Resumen</p>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[17px] font-bold text-white" style={{ background: c.accent }}>{previewMark}</span>
            <div className="min-w-0">
              <div className="truncate text-base font-bold">{form.symbol || 'Nuevo activo'}</div>
              <div className="text-xs text-neutral-500">{cfg.label}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Operación</span><span className="font-semibold" style={{ color: kind === 'buy' ? '#16A34A' : '#DC2626' }}>{kind === 'buy' ? 'Compra' : 'Venta'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Cantidad</span><span className="font-medium tabular-nums">{qty ? qty.toLocaleString('es-AR') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Precio unitario</span><span className="font-medium tabular-nums">{price ? fmt(price) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Comisión</span><span className="font-medium tabular-nums">{fee ? fmt(fee) : '—'}</span></div>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between border-t border-neutral-200 pt-3.5 dark:border-neutral-800">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Total estimado</span>
            <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes gf-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
