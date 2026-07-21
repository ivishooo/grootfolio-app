/**
 * Gestión de activos (GF-249) — rediseño. Lista los holdings con avatar por
 * tipo, ticker, % de cartera, precio prom→actual y P&L en $ y %. Cada holding
 * se expande a sus transacciones (editar / eliminar). Reusa queries, toasts y
 * el popup de confirmación (con estado de carga).
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
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Banner } from '@/components/ui/Banner'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import { EmptyState, ErrorState } from '@/components/ui/States'

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

export function AssetsPage() {
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()
  const { data: transactions } = useTransactions()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bannerOpen, setBannerOpen] = useState(true)
  const deletePosition = useDeleteAssetPosition()
  const { toast } = useToast()
  const confirm = useConfirm()

  const handleDeletePosition = (holding: Holding) => {
    void confirm({
      title: 'Eliminar posición',
      message: `¿Eliminar toda la posición de ${holding.asset.name}? Se borran todas sus transacciones. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar posición',
      onConfirm: async () => {
        try {
          await deletePosition.mutateAsync(holding.assetId)
          toast('Posición eliminada', 'info', { description: 'Se borraron todas sus transacciones.' })
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la posición.', 'error')
          throw err
        }
      },
    })
  }

  const total = p?.totalValue ?? 0

  return (
    <div className="space-y-5">
      {bannerOpen && (
        <Banner variant="info" onDismiss={() => setBannerOpen(false)}>
          Los precios de mercado se actualizan cada 15 minutos.
        </Banner>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activos</h2>
          {p && p.holdings.length > 0 && (
            <p className="mt-1 text-sm text-neutral-500">
              {p.holdings.length} posiciones · Valor total{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(total)}</strong>
            </p>
          )}
        </div>
        <Link to="/assets/new">
          <Button className="inline-flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Cargar activo
          </Button>
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
              total={total}
              transactions={(transactions ?? []).filter((tx) => tx.assetId === h.assetId)}
              expanded={expanded === h.assetId}
              onToggle={() => setExpanded((cur) => (cur === h.assetId ? null : h.assetId))}
              onDeletePosition={() => handleDeletePosition(h)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface HoldingRowProps {
  holding: Holding
  total: number
  transactions: Transaction[]
  expanded: boolean
  onToggle: () => void
  onDeletePosition: () => void
}

function HoldingRow({ holding, total, transactions, expanded, onToggle, onDeletePosition }: HoldingRowProps) {
  const c = assetColor(holding.asset.type)
  const pct = total > 0 ? (holding.value / total) * 100 : 0
  const up = holding.pnl >= 0
  const pnlColor = up ? 'text-success-500' : 'text-danger-500'

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3.5 p-[18px]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label="Expandir"
          className="mt-1.5 text-xs text-neutral-400"
        >
          {expanded ? '▾' : '▸'}
        </button>

        <AssetAvatar asset={holding.asset} size={46} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">{holding.asset.name}</span>
            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide" style={{ color: c.accent, background: c.soft }}>
              {holding.asset.symbol}
            </span>
            <span className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-400 dark:border-neutral-700">
              {assetTypeLabel[holding.asset.type as AssetType] ?? holding.asset.type}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            {holding.quantity} unidades · Compra{' '}
            <span className="font-medium text-neutral-600 dark:text-neutral-300">{formatCurrency(holding.avgPrice)}</span> → Actual{' '}
            <span className="font-medium text-neutral-600 dark:text-neutral-300">{formatCurrency(holding.currentPrice)}</span>
          </p>
          <div className="mt-2.5 flex max-w-[340px] items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.accent }} />
            </div>
            <span className="whitespace-nowrap text-[11px] font-semibold text-neutral-400">{pct.toFixed(1)}% del portafolio</span>
          </div>
        </div>

        <div className="flex min-w-[130px] flex-col items-end gap-0.5">
          <span className="text-lg font-bold tabular-nums">{formatCurrency(holding.value)}</span>
          <span className={`text-xs font-semibold tabular-nums ${pnlColor}`}>
            {up ? '▲' : '▼'} {formatPercent(holding.pnlPercent)}
          </span>
          <span className={`text-xs font-medium tabular-nums ${pnlColor}`}>{formatCurrency(holding.pnl)}</span>
          <Button variant="secondary" size="sm" className="mt-2" onClick={onDeletePosition}>
            Eliminar posición
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-neutral-200 bg-neutral-50 p-[18px] dark:border-neutral-800 dark:bg-neutral-800/40">
          {transactions.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin transacciones para este activo.</p>
          ) : (
            transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          )}
        </div>
      )}
    </div>
  )
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const [editing, setEditing] = useState(false)
  const deleteTx = useDeleteTransaction()
  const { toast } = useToast()
  const confirm = useConfirm()

  const handleDelete = () => {
    void confirm({
      title: 'Eliminar transacción',
      message: '¿Eliminar esta transacción? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTx.mutateAsync(tx.id)
          toast('Transacción eliminada')
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la transacción.', 'error')
          throw err
        }
      },
    })
  }

  if (editing) {
    return <TransactionEditForm tx={tx} onClose={() => setEditing(false)} />
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
        <span className={`font-semibold ${tx.kind === 'buy' ? 'text-success-500' : 'text-danger-500'}`}>
          {tx.kind === 'buy' ? 'Compra' : 'Venta'}
        </span>
        <span>{tx.quantity} unidades</span>
        <span>{tx.unitPrice} {tx.priceCurrency}</span>
        <span className="text-neutral-500">Comisión: {tx.fee}</span>
        <span className="text-neutral-500">{formatDate(tx.purchasedAt)}</span>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteTx.isPending}>
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
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex gap-2">
        <Button variant={kind === 'buy' ? 'primary' : 'secondary'} size="sm" fullWidth onClick={() => setKind('buy')}>
          Compra
        </Button>
        <Button variant={kind === 'sell' ? 'primary' : 'secondary'} size="sm" fullWidth onClick={() => setKind('sell')}>
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
                <option key={c} value={c}>{c}</option>
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
