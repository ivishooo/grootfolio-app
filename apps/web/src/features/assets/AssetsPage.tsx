/**
 * Gestion de activos (GF-249): lista los holdings del portfolio, permite
 * expandir cada uno para ver sus transacciones, y editar/eliminar transacciones
 * o borrar toda la posicion. Reusa las queries y toasts existentes.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  assetTypeLabel,
  formatCurrency,
  formatPercent,
  updateTransactionInputSchema,
} from '@grootfolio/shared'
import type { AssetType, Holding, Transaction, UpdateTransactionInput } from '@grootfolio/shared'
import {
  useDeleteAssetPosition,
  useDeleteTransaction,
  usePortfolio,
  useTransactions,
  useUpdateTransaction,
} from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { EmptyState, ErrorState } from '@/components/ui/States'

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

/** El input date espera YYYY-MM-DD; recortamos el ISO del back. */
function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

export function AssetsPage() {
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()
  const { data: transactions } = useTransactions()
  const [expanded, setExpanded] = useState<string | null>(null)
  const deletePosition = useDeleteAssetPosition()
  const { toast } = useToast()

  const handleDeletePosition = (holding: Holding) => {
    if (!window.confirm(`¿Eliminar toda la posición de ${holding.asset.name}?`)) return
    deletePosition.mutate(holding.assetId, {
      onSuccess: () => toast('Posición eliminada'),
      onError: (err) =>
        toast(err instanceof Error ? err.message : 'No se pudo eliminar la posición.', 'error'),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activos</h2>
        <Link to="/assets/new">
          <Button>Cargar activo</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-500">Cargando activos…</p>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el portfolio.'}
          onRetry={() => void refetch()}
        />
      ) : !p || p.holdings.length === 0 ? (
        <Card>
          <EmptyState
            title="Todavía no tenés activos"
            description="Cargá tu primera transacción para empezar a ver tu portafolio."
            action={
              <Link to="/assets/new">
                <Button>Cargar activo</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {p.holdings.map((h) => (
            <HoldingRow
              key={h.assetId}
              holding={h}
              transactions={(transactions ?? []).filter((tx) => tx.assetId === h.assetId)}
              expanded={expanded === h.assetId}
              onToggle={() => setExpanded((cur) => (cur === h.assetId ? null : h.assetId))}
              onDeletePosition={() => handleDeletePosition(h)}
              deleting={deletePosition.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface HoldingRowProps {
  holding: Holding
  transactions: Transaction[]
  expanded: boolean
  onToggle: () => void
  onDeletePosition: () => void
  deleting: boolean
}

function HoldingRow({
  holding,
  transactions,
  expanded,
  onToggle,
  onDeletePosition,
  deleting,
}: HoldingRowProps) {
  return (
    <Card padding="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="text-neutral-400">{expanded ? '▾' : '▸'}</span>
          <div>
            <p className="font-medium">{holding.asset.name}</p>
            <p className="text-xs text-neutral-500">
              {assetTypeLabel[holding.asset.type as AssetType] ?? holding.asset.type} ·{' '}
              {holding.quantity} unidades
            </p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium tabular-nums">{formatCurrency(holding.value)}</p>
            <p
              className={`text-xs tabular-nums ${
                holding.pnlPercent >= 0 ? 'text-success-500' : 'text-danger-500'
              }`}
            >
              {formatPercent(holding.pnlPercent)}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={onDeletePosition} disabled={deleting}>
            Eliminar posición
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          {transactions.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin transacciones para este activo.</p>
          ) : (
            transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          )}
        </div>
      )}
    </Card>
  )
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const [editing, setEditing] = useState(false)
  const deleteTx = useDeleteTransaction()
  const { toast } = useToast()

  const handleDelete = () => {
    if (!window.confirm('¿Eliminar esta transacción?')) return
    deleteTx.mutate(tx.id, {
      onSuccess: () => toast('Transacción eliminada'),
      onError: (err) =>
        toast(err instanceof Error ? err.message : 'No se pudo eliminar la transacción.', 'error'),
    })
  }

  if (editing) {
    return <TransactionEditForm tx={tx} onClose={() => setEditing(false)} />
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/50">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span
          className={`font-medium ${tx.kind === 'buy' ? 'text-success-500' : 'text-danger-500'}`}
        >
          {tx.kind === 'buy' ? 'Compra' : 'Venta'}
        </span>
        <span className="tabular-nums">{tx.quantity} unidades</span>
        <span className="tabular-nums">
          {tx.unitPrice} {tx.priceCurrency}
        </span>
        <span className="text-neutral-500">Comisión: {tx.fee}</span>
        <span className="text-neutral-500">{formatDate(tx.purchasedAt)}</span>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteTx.isPending}
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}

function TransactionEditForm({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const updateTx = useUpdateTransaction()
  const { toast } = useToast()
  const [kind, setKind] = useState<'buy' | 'sell'>(tx.kind)
  const [quantity, setQuantity] = useState(String(tx.quantity))
  const [unitPrice, setUnitPrice] = useState(String(tx.unitPrice))
  const [priceCurrency, setPriceCurrency] = useState(tx.priceCurrency)
  const [fee, setFee] = useState(String(tx.fee))
  const [purchasedAt, setPurchasedAt] = useState(isoToDateInput(tx.purchasedAt))
  const [notes, setNotes] = useState(tx.notes ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    // Mandamos solo los campos con valor para respetar la edicion parcial.
    const input: UpdateTransactionInput = { kind }
    if (quantity.trim() !== '') input.quantity = parseFloat(quantity)
    if (unitPrice.trim() !== '') input.unitPrice = parseFloat(unitPrice)
    if (priceCurrency.trim() !== '') input.priceCurrency = priceCurrency
    if (fee.trim() !== '') input.fee = parseFloat(fee)
    if (purchasedAt.trim() !== '') input.purchasedAt = new Date(purchasedAt).toISOString()
    if (notes.trim() !== '') input.notes = notes

    const parsed = updateTransactionInputSchema.safeParse(input)
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message ?? 'Datos inválidos.')
      return
    }
    setFormError(null)
    updateTx.mutate(
      { id: tx.id, input: parsed.data },
      {
        onSuccess: () => {
          toast('Transacción actualizada')
          onClose()
        },
        onError: (err) =>
          setFormError(err instanceof Error ? err.message : 'No se pudo actualizar la transacción.'),
      },
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex gap-2">
        <Button
          variant={kind === 'buy' ? 'primary' : 'secondary'}
          size="sm"
          fullWidth
          onClick={() => setKind('buy')}
        >
          Compra
        </Button>
        <Button
          variant={kind === 'sell' ? 'primary' : 'secondary'}
          size="sm"
          fullWidth
          onClick={() => setKind('sell')}
        >
          Venta
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Cantidad" value={quantity} onChange={setQuantity} type="number" />
        <div className="text-sm">
          <label htmlFor={`unitPrice-${tx.id}`} className="mb-1 block font-medium">
            Precio unitario
          </label>
          <div className="flex gap-2">
            <input
              id={`unitPrice-${tx.id}`}
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <select
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value)}
              aria-label="Moneda del precio"
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {PRICE_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Input label="Comisión" value={fee} onChange={setFee} type="number" />
        <Input label="Fecha de compra" value={purchasedAt} onChange={setPurchasedAt} type="date" />
      </div>
      <Input label="Notas" value={notes} onChange={setNotes} multiline />

      {formError && <p className="text-sm font-medium text-danger-500">{formError}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={updateTx.isPending}>
          {updateTx.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={updateTx.isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
