import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTransactionInputSchema, type CreateTransactionInput } from '@grootfolio/shared'
import { useCreateTransaction } from '@/lib/queries'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'

const ASSET_TYPES = [
  { value: 'crypto', label: 'Criptomonedas', icon: '₿' },
  { value: 'stock', label: 'Accion', icon: '↗' },
  { value: 'bond', label: 'Bono', icon: '🏛' },
  { value: 'currency', label: 'Divisa', icon: '$' },
]

type AssetType = CreateTransactionInput['type']

export function AddAssetPage() {
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState<AssetType>('crypto')
  const [kind, setKind] = useState<'buy' | 'sell'>('buy')
  const [form, setForm] = useState({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createTx = useCreateTransaction()

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
    setSuccess(false)
    setSubmitError(null)
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
    setSubmitError(null)
    createTx.mutate(result.data, {
      onSuccess: () => {
        setSuccess(true)
        setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
      },
      onError: (err) => {
        setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la transaccion.')
      },
    })
  }

  const handleCancel = () => {
    setForm({ symbol: '', quantity: '', unitPrice: '', fee: '', purchasedAt: '', notes: '' })
    setErrors({})
    navigate('/dashboard')
  }

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
          <Input label="Nombre del activo" placeholder="Ej: Bitcoin, Apple Inc..." value={form.symbol} error={errors.symbol} onChange={(v) => updateField('symbol', v)} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Cantidad" placeholder="0.5" value={form.quantity} error={errors.quantity} onChange={(v) => updateField('quantity', v)} type="number" />
            <Input label="Precio unitario (USD)" placeholder="50000" value={form.unitPrice} error={errors.unitPrice} onChange={(v) => updateField('unitPrice', v)} type="number" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Comision (USD)" placeholder="0" value={form.fee} error={errors.fee} onChange={(v) => updateField('fee', v)} type="number" />
            <Input label="Fecha de compra" value={form.purchasedAt} error={errors.purchasedAt} onChange={(v) => updateField('purchasedAt', v)} type="date" />
          </div>
          <Input label="Notas (opcional)" placeholder="Observaciones..." value={form.notes} error={errors.notes} onChange={(v) => updateField('notes', v)} multiline />

          {success && <p className="text-success-500 text-sm font-medium">Transaccion guardada correctamente</p>}
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
