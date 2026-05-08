import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTransactionInputSchema, type CreateTransactionInput } from '@grootfolio/shared'

const ASSET_TYPES = [
  { value: 'crypto', label: 'Criptomonedas', icon: '₿' },
  { value: 'stock', label: 'Accion', icon: '↗' },
  { value: 'bond', label: 'Bono', icon: '🏛' },
  { value: 'currency', label: 'Divisa', icon: '$' },
] as const

type AssetType = CreateTransactionInput['type']

export function AddAssetPage() {
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
    setSuccess(false)
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
    setSuccess(true)
    setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
  }

  const handleCancel = () => {
    setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
    setErrors({})
    navigate('/dashboard')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Cargar Activo</h2>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ASSET_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => { setActiveType(t.value); setErrors((p) => ({ ...p, type: '' })) }}
            className={`rounded-2xl border p-5 text-center transition-colors ${
              activeType === t.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
            }`}
          >
            <div className="text-2xl">{t.icon}</div>
            <div className="mt-1 text-sm font-medium">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Kind toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setKind('buy')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${kind === 'buy' ? 'bg-success-500 text-white' : 'border border-neutral-200 dark:border-neutral-700'}`}
        >
          Compra
        </button>
        <button
          onClick={() => setKind('sell')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${kind === 'sell' ? 'bg-danger-500 text-white' : 'border border-neutral-200 dark:border-neutral-700'}`}
        >
          Venta
        </button>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Field label="Nombre del activo" placeholder="Ej: Bitcoin, Apple Inc..." value={form.symbol} error={errors.symbol} onChange={(v) => updateField('symbol', v)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cantidad" placeholder="0.5" value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} type="number" />
          <Field label="Precio unitario (USD)" placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} type="number" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Comision (USD)" placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} type="number" />
          <Field label="Fecha de compra" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} type="date" />
        </div>
        <Field label="Notas (opcional)" placeholder="Observaciones sobre esta inversion..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} multiline />

        {success && <p className="text-success-500 text-sm font-medium">Activo guardado correctamente (mock)</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} className="flex-1 rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600">
            Guardar Activo
          </button>
          <button onClick={handleCancel} className="rounded-lg border border-neutral-300 px-6 py-2.5 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
            Cancelar
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl bg-neutral-700 p-5 text-white dark:bg-neutral-800">
        <div className="font-semibold">Consejos</div>
        <ul className="mt-2 list-disc pl-6 text-sm text-neutral-200 space-y-1">
          <li>Registra todos tus activos para tener un panorama completo</li>
          <li>Actualiza regularmente los precios de tus inversiones</li>
          <li>Diversifica tu portafolio entre diferentes tipos de activos</li>
          <li>Manten notas sobre el motivo de cada inversion</li>
        </ul>
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, error, onChange, type, multiline }: {
  label: string; placeholder?: string; value: string; error?: string
  onChange: (v: string) => void; type?: string; multiline?: boolean
}) {
  const cls = `w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-neutral-800 ${error ? 'border-danger-500' : 'border-neutral-200 dark:border-neutral-700'}`
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {multiline ? (
        <textarea placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input type={type ?? 'text'} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {error && <p className="text-danger-500 text-xs mt-1">{error}</p>}
    </label>
  )
}
