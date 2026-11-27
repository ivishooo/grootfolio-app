/**
 * Cargar activo (rediseño v2, Fase 4). SPEC-pantallas › Cargar activo.
 *
 * Tres pasos en una tarjeta: 1) ¿qué activo? (el buscador completa tipo y
 * moneda; el tipo ya no se elige antes), 2) ¿compraste o vendiste?, 3) cantidad
 * y precio. El resumen va al costado (sticky). Prefill desde la URL:
 * `/assets/new?asset=BTC&kind=sell` (lo usan «+ Comprar más» y «Vender» de
 * Activos). Se mantienen las validaciones: Zod, TX_CURRENCY_MISMATCH y CEDEAR.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { assetTypeLabel, createTransactionInputSchema, formatCurrency, formatQuantity, dateInputToISO, isoToDateInput } from '@grootfolio/shared'
import type { AssetSearchResult, AssetType, Holding } from '@grootfolio/shared'
import { useCreateTransaction, usePortfolio } from '@/lib/queries'
import { useGroot } from '@/components/groot/GrootProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { AssetAutocomplete } from '@/components/ui/AssetAutocomplete'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'

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
  stock: { label: 'Acciones', symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: Apple, GGAL.BA...', qtyLabel: 'Cantidad', qtyPlaceholder: '10', priceLabel: 'Precio unitario', showCurrency: true, help: 'Si compraste un CEDEAR, elegí el ticker terminado en .BA y cargá el precio en pesos. Las acciones de EE. UU. van en dólares.' },
  bond: { label: 'Bonos', symbolLabel: 'Nombre del activo', symbolPlaceholder: 'Ej: US-T, AL30...', qtyLabel: 'Cantidad', qtyPlaceholder: '10', priceLabel: 'Precio unitario', showCurrency: true, help: 'Los bonos aún no tienen precio en vivo (valuación manual).' },
  currency: { label: 'Divisas', symbolLabel: 'Moneda que compraste', symbolPlaceholder: 'Ej: USD, EUR', qtyLabel: 'Cantidad comprada', qtyPlaceholder: '50', priceLabel: 'Precio pagado por unidad', showCurrency: true, help: 'Ej: compraste 50 USD pagando 1450 ARS cada uno.' },
}

const TYPE_ORDER: AssetType[] = ['crypto', 'stock', 'bond', 'currency']

/** Hoy en hora local, para el default y el tope del campo de fecha. */
const todayInput = () => isoToDateInput(new Date().toISOString())

const emptyForm = { symbol: '', quantity: '', unitPrice: '', fee: '', priceCurrency: 'USD', purchasedAt: todayInput(), notes: '' }

const CARD = 'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none'
const fieldCls =
  'h-[46px] w-full rounded-[10px] border border-ctl bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-500'

type Selected = { symbol: string; name: string; type: AssetType; currency: string }

function StepHead({ n, state, title }: { n: number; state: 'current' | 'done' | 'pending'; title: string }) {
  const cls =
    state === 'current' ? 'bg-brand-500 text-white' : state === 'done' ? 'bg-pos text-white dark:text-neutral-900' : 'bg-muted text-ink-3'
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`grid h-6 w-6 place-items-center rounded-full font-mono text-xs font-medium ${cls}`} aria-hidden="true">
        {state === 'done' ? '✓' : n}
      </span>
      <h2 className="text-[15px] font-semibold">{title}</h2>
    </div>
  )
}

function Field({ label, optional, help, children, htmlFor }: { label: string; optional?: boolean; help?: React.ReactNode; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label} {optional && <span className="font-normal text-ink-3">· opcional</span>}
      </label>
      {children}
      {help && <div className="text-xs text-ink-3">{help}</div>}
    </div>
  )
}

export function AddAssetPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const groot = useGroot()
  const { data: portfolio } = usePortfolio()
  const [filterType, setFilterType] = useState<AssetType | undefined>(undefined)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [kind, setKind] = useState<'buy' | 'sell'>(params.get('kind') === 'sell' ? 'sell' : 'buy')
  const [form, setForm] = useState({ ...emptyForm })
  const [showNotes, setShowNotes] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createTx = useCreateTransaction()
  const { toast } = useToast()
  const fromAssets = params.get('from') === 'assets'

  // Prefill: «+ Comprar más» / «Vender» de Activos traen el activo en la URL.
  const prefill = params.get('asset')
  useEffect(() => {
    if (!prefill || selected || !portfolio) return
    const h = portfolio.holdings.find((x) => x.asset.symbol.toUpperCase() === prefill.toUpperCase())
    if (!h) return
    const sel = { symbol: h.asset.symbol, name: h.asset.name, type: h.asset.type as AssetType, currency: h.asset.symbol.toUpperCase().endsWith('.BA') ? 'ARS' : 'USD' }
    setSelected(sel)
    setForm((p) => ({ ...p, symbol: sel.symbol, priceCurrency: TYPE_FORM[sel.type].showCurrency ? sel.currency : 'USD' }))
  }, [prefill, selected, portfolio])

  const type: AssetType = selected?.type ?? filterType ?? 'crypto'
  const holding: Holding | undefined = portfolio?.holdings.find(
    (h) => h.asset.symbol.toUpperCase() === (selected?.symbol ?? form.symbol).trim().toUpperCase(),
  )

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
    setSubmitError(null)
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
        priceCurrency: 'Las acciones de EE. UU. cotizan en dólares. Si compraste el CEDEAR en pesos, buscá el ticker terminado en .BA.',
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
      // dateInputToISO ancla al mediodia local: `new Date('2026-08-01')` se parsea
      // como medianoche UTC y en Argentina caia el dia anterior.
      purchasedAt: form.purchasedAt ? dateInputToISO(form.purchasedAt) : '',
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
        toast(kind === 'buy' ? 'Compra guardada' : 'Venta guardada', 'success', { description: 'Ya la ves en tu portafolio.' })
        groot.decir('cargado', {
          morder: true,
          lastTx: { qty: result.data.quantity.toLocaleString('es-AR', { maximumFractionDigits: 8 }), symbol: result.data.symbol },
        })
        navigate('/dashboard')
      },
      onError: (err) => {
        setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la transacción.')
      },
    })
  }

  const handleSelectAsset = (r: AssetSearchResult) => {
    setSelected({ symbol: r.symbol, name: r.name, type: r.type, currency: r.currency })
    setForm((p) => ({
      ...p,
      symbol: r.symbol,
      priceCurrency:
        TYPE_FORM[r.type].showCurrency && (PRICE_CURRENCIES as readonly string[]).includes(r.currency) ? r.currency : 'USD',
    }))
    setErrors((p) => ({ ...p, symbol: '' }))
    setSubmitError(null)
  }

  const clearAsset = () => {
    setSelected(null)
    setForm((p) => ({ ...p, symbol: '' }))
  }

  const handleCancel = () => navigate(fromAssets ? '/assets' : '/dashboard')

  const cfg = TYPE_FORM[type]
  const c = assetColor(type)
  const cur = cfg.showCurrency ? form.priceCurrency : 'USD'
  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.unitPrice) || 0
  const fee = parseFloat(form.fee) || 0
  const subtotal = qty * price
  const total = kind === 'buy' ? subtotal + fee : subtotal - fee
  const fmt = (n: number) => formatCurrency(n, cur)
  const chosen = selected !== null || form.symbol.trim() !== ''
  const ready = chosen && qty > 0 && price > 0
  const step = !chosen ? 1 : qty > 0 && price > 0 ? 4 : 3
  // Precio de hoy: solo lo sabemos si el activo ya está en el portafolio (en USD).
  const todayPrice = holding && holding.currentPrice > 0 && cur === 'USD' ? holding.currentPrice : null
  const sellGain = kind === 'sell' && holding && cur === 'USD' && ready ? (price - holding.avgPrice) * qty - fee : null
  const sym = selected?.symbol ?? form.symbol.trim().toUpperCase()

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <div>
        {fromAssets && (
          <button onClick={() => navigate('/assets')} className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink hover:underline">
            ← Volver a Activos
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Cargar activo</h1>
        <p className="mt-1 text-sm text-ink-2">Registrá una compra o una venta en tres pasos.</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className={`${CARD} divide-y divide-line`}>
          {/* 1 · ¿Qué activo? */}
          <section className="p-4 md:p-5">
            <StepHead n={1} state={chosen ? 'done' : 'current'} title="¿Qué activo?" />
            {selected ? (
              <div className="flex items-center gap-3 rounded-xl border-[1.5px] p-3" style={{ borderColor: c.accent, background: c.soft }}>
                <AssetAvatar asset={{ symbol: selected.symbol, name: selected.name, type: selected.type, iconUrl: holding?.asset.iconUrl }} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{selected.name}</p>
                  <p className="text-xs text-ink-2">
                    {selected.symbol} · {assetTypeLabel[selected.type]}
                    {todayPrice !== null && ` · hoy ${formatCurrency(todayPrice, 'USD')}`}
                  </p>
                </div>
                <button type="button" onClick={clearAsset} className="h-9 rounded-lg border border-ctl bg-surface px-3 text-[13px] font-semibold hover:bg-muted">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
                  {TYPE_ORDER.map((t) => {
                    const on = filterType === t
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFilterType(on ? undefined : t)}
                        className={`h-[34px] rounded-[20px] border px-3 text-[13px] font-semibold ${on ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:bg-muted'}`}
                      >
                        {assetTypeLabel[t]}
                      </button>
                    )
                  })}
                </div>
                <AssetAutocomplete
                  label="Nombre o ticker"
                  value={form.symbol}
                  onChange={(v) => updateField('symbol', v)}
                  onSelect={handleSelectAsset}
                  type={filterType}
                  placeholder="Nombre o ticker: Bitcoin, AAPL, AL30…"
                  error={errors.symbol}
                />
              </div>
            )}
            {cfg.help && chosen && <p className="mt-2.5 text-[12.5px] text-ink-2">{cfg.help}</p>}
          </section>

          <fieldset disabled={!chosen} className={`divide-y divide-line transition-opacity ${chosen ? '' : 'opacity-45'}`}>
            {/* 2 · ¿Compraste o vendiste? */}
            <section className="p-4 md:p-5">
              <StepHead n={2} state={!chosen ? 'pending' : 'done'} title="¿Compraste o vendiste?" />
              <div role="radiogroup" aria-label="Operación" className="flex gap-[3px] rounded-[10px] bg-muted p-[3px]">
                {(['buy', 'sell'] as const).map((k) => {
                  const on = kind === k
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setKind(k)}
                      className={`flex h-[42px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${on ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]' : 'text-ink-3'}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${k === 'buy' ? 'bg-pos' : 'bg-neg'}`} aria-hidden="true" />
                      {k === 'buy' ? 'Compra' : 'Venta'}
                    </button>
                  )
                })}
              </div>
              {kind === 'sell' && chosen && (
                <p className="mt-2.5 text-[13px] text-ink-2">
                  {holding ? (
                    <>
                      Tenés {formatQuantity(holding.quantity)} {holding.asset.symbol}.{' '}
                      <button type="button" onClick={() => updateField('quantity', String(Number(holding.quantity.toFixed(8))))} className="font-semibold text-brand-ink hover:underline">
                        Vender todo
                      </button>
                    </>
                  ) : (
                    `No tenés ${sym} cargado: no se puede vender lo que no compraste.`
                  )}
                </p>
              )}
            </section>

            {/* 3 · Cantidad y precio */}
            <section className="p-4 md:p-5">
              <StepHead n={3} state={step < 3 ? 'pending' : step === 3 ? 'current' : 'done'} title="Cantidad y precio" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={cfg.qtyLabel} htmlFor="f-qty" help={errors.quantity && <span className="text-neg">{errors.quantity}</span>}>
                  <input id="f-qty" className={fieldCls} type="number" inputMode="decimal" placeholder={cfg.qtyPlaceholder} value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
                </Field>
                <Field
                  label={kind === 'buy' ? 'Precio que pagaste' : 'Precio al que vendiste'}
                  htmlFor="f-price"
                  help={
                    errors.unitPrice ? (
                      <span className="text-neg">{errors.unitPrice}</span>
                    ) : errors.priceCurrency ? (
                      <span className="text-neg">{errors.priceCurrency}</span>
                    ) : todayPrice !== null ? (
                      <>
                        Hoy cotiza {formatCurrency(todayPrice, 'USD')} ·{' '}
                        <button type="button" onClick={() => updateField('unitPrice', String(todayPrice))} className="font-semibold text-brand-ink hover:underline">
                          Usar este
                        </button>
                      </>
                    ) : undefined
                  }
                >
                  <div className="flex gap-2">
                    <input id="f-price" className={fieldCls} type="number" inputMode="decimal" placeholder="0" value={form.unitPrice} onChange={(e) => updateField('unitPrice', e.target.value)} />
                    {cfg.showCurrency ? (
                      <select
                        value={form.priceCurrency}
                        onChange={(e) => updateField('priceCurrency', e.target.value)}
                        aria-label="Moneda del precio"
                        className="h-[46px] rounded-[10px] border border-ctl bg-surface px-2 text-sm"
                      >
                        {PRICE_CURRENCIES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="grid h-[46px] place-items-center px-2 text-sm text-ink-3">USD</span>
                    )}
                  </div>
                </Field>
                <Field label={kind === 'buy' ? 'Fecha de compra' : 'Fecha de venta'} htmlFor="f-date" help={errors.purchasedAt && <span className="text-neg">{errors.purchasedAt}</span>}>
                  <input id="f-date" className={fieldCls} type="date" max={todayInput()} value={form.purchasedAt} onChange={(e) => updateField('purchasedAt', e.target.value)} />
                </Field>
                <Field label="Comisión" optional htmlFor="f-fee">
                  <input id="f-fee" className={fieldCls} type="number" inputMode="decimal" placeholder="0" value={form.fee} onChange={(e) => updateField('fee', e.target.value)} />
                </Field>
              </div>
              {showNotes ? (
                <div className="mt-4">
                  <Field label="Nota" optional htmlFor="f-notes">
                    <textarea id="f-notes" rows={3} className={`${fieldCls} h-auto py-2.5`} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
                  </Field>
                </div>
              ) : (
                <button type="button" onClick={() => setShowNotes(true)} className="mt-3 text-[13px] font-semibold text-brand-ink hover:underline">
                  + Agregar una nota
                </button>
              )}
            </section>
          </fieldset>
        </div>

        {/* Resumen */}
        <aside className={`${CARD} sticky top-[76px] p-[18px]`} aria-label="Resumen">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Resumen</p>
          <div className="mt-3 flex items-center gap-2.5">
            {chosen ? (
              <AssetAvatar asset={{ symbol: sym, name: selected?.name ?? sym, type, iconUrl: holding?.asset.iconUrl }} size={34} />
            ) : (
              <span className="h-[34px] w-[34px] rounded-full bg-muted" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{chosen ? selected?.name ?? sym : 'Elegí un activo'}</p>
              <p className={`text-xs font-semibold ${kind === 'buy' ? 'text-pos' : 'text-neg'}`}>{kind === 'buy' ? 'Compra' : 'Venta'}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-[13px] tabular-nums">
            <div className="flex justify-between gap-2 text-ink-2">
              <span>{qty > 0 && price > 0 ? `${formatQuantity(qty)} × ${fmt(price)}` : 'Cantidad × precio'}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-2 text-ink-2">
              <span>Comisión</span>
              <span>{fmt(fee)}</span>
            </div>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[13px] text-ink-2">{kind === 'buy' ? 'Total que pagaste' : 'Total que cobraste'}</p>
            <p className="text-[22px] font-extrabold tabular-nums">{fmt(total)}</p>
            {sellGain !== null && (
              <p className={`mt-1 text-[13px] font-semibold tabular-nums ${sellGain >= 0 ? 'text-pos' : 'text-neg'}`}>
                Ganancia de esta venta: {sellGain >= 0 ? '+' : '−'}{fmt(Math.abs(sellGain))}
              </p>
            )}
          </div>
          {submitError && <p className="mt-3 text-sm font-medium text-neg" role="alert">{submitError}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createTx.isPending}
            aria-disabled={!ready}
            className={`mt-4 h-12 w-full rounded-[11px] bg-brand-500 text-[15px] font-semibold text-white transition-opacity hover:bg-brand-600 ${ready ? '' : 'opacity-50'}`}
          >
            {createTx.isPending ? 'Guardando…' : kind === 'buy' ? 'Guardar compra' : 'Guardar venta'}
          </button>
          <button type="button" onClick={handleCancel} className="mt-2 h-10 w-full rounded-[10px] text-sm font-semibold text-ink-2 hover:bg-muted">
            Cancelar
          </button>
        </aside>
      </div>
    </div>
  )
}
