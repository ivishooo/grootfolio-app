/**
 * Activos (rediseño v2, Fase 4). SPEC-pantallas › Activos.
 *
 * - Resumen: Valor hoy / Invertido / Resultado.
 * - Chips por tipo y «Ordenar: Valor · Resultado · A–Z».
 * - Toda la fila es el botón que expande (`aria-expanded`). Adentro: 4 datos,
 *   las operaciones con «Editar» y «+ Comprar más» / «Vender», que abren Cargar
 *   con el activo ya elegido. «Eliminar posición…» va en rojo con confirmación.
 * - `?open=<assetId>` abre una fila expandida (lo usa Inicio).
 */
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  assetTypeLabel,
  dateInputToISO,
  formatCurrency,
  formatDate,
  formatPctArrow,
  formatQuantity,
  isoToDateInput,
  updateTransactionInputSchema,
} from '@grootfolio/shared'
import { useMoney, signedMoney } from '@/lib/money'
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
import { Input } from '@/components/ui/Input'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { DayChip } from '@/components/ui/DayChip'
import { assetColor } from '@/lib/asset-visual'
import { useTheme } from '@/theme/ThemeProvider'
import { EmptyState, ErrorState } from '@/components/ui/States'

const PRICE_CURRENCIES = ['USD', 'ARS', 'EUR'] as const
type PriceCurrency = (typeof PRICE_CURRENCIES)[number]

const CARD = 'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none'
const TYPE_ORDER: AssetType[] = ['crypto', 'stock', 'bond', 'currency']
const SORTS = [
  { id: 'valor', label: 'Valor' },
  { id: 'resultado', label: 'Resultado' },
  { id: 'az', label: 'A–Z' },
] as const
type SortId = (typeof SORTS)[number]['id']

/** Sin cotización el backend manda currentPrice 0: no es «vale cero», es «no sabemos». */
const sinCotizacion = (h: Holding) => h.currentPrice <= 0

export function AssetsPage() {
  const { data: p, isLoading, isError, error, refetch, dataUpdatedAt } = usePortfolio()
  const money = useMoney()
  const navigate = useNavigate()
  const { data: transactions } = useTransactions()
  const [params, setParams] = useSearchParams()
  const expanded = params.get('open')
  const [filter, setFilter] = useState<AssetType | 'all'>('all')
  const [sort, setSort] = useState<SortId>('valor')
  const deletePosition = useDeleteAssetPosition()
  const { toast } = useToast()
  const confirm = useConfirm()

  const toggle = (assetId: string) => {
    const next = new URLSearchParams(params)
    if (expanded === assetId) next.delete('open')
    else next.set('open', assetId)
    setParams(next, { replace: true })
  }

  const handleDeletePosition = (holding: Holding) => {
    void confirm({
      title: 'Eliminar posición',
      message: `¿Eliminar toda la posición de ${holding.asset.name}? Se borran todas sus operaciones. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar posición',
      onConfirm: async () => {
        try {
          await deletePosition.mutateAsync(holding.assetId)
          toast('Posición eliminada', 'info', { description: 'Se borraron todas sus operaciones.' })
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la posición.', 'error')
          throw err
        }
      },
    })
  }

  const holdings = p?.holdings ?? []
  const total = p?.totalValue ?? 0
  const invested = p ? p.totalValue - p.pnlAbsolute : 0
  const counts = useMemo(() => {
    const c = new Map<AssetType, number>()
    for (const h of holdings) c.set(h.asset.type as AssetType, (c.get(h.asset.type as AssetType) ?? 0) + 1)
    return c
  }, [holdings])

  const visible = useMemo(() => {
    const list = holdings.filter((h) => filter === 'all' || h.asset.type === filter)
    const sorted = [...list]
    if (sort === 'valor') sorted.sort((a, b) => b.value - a.value)
    if (sort === 'resultado') sorted.sort((a, b) => (b.pnlPercent ?? -Infinity) - (a.pnlPercent ?? -Infinity))
    if (sort === 'az') sorted.sort((a, b) => a.asset.name.localeCompare(b.asset.name, 'es'))
    return sorted
  }, [holdings, filter, sort])

  const time = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="flex-1 text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Activos</h1>
        {time && <span className="font-mono text-[11.5px] font-medium text-ink-3">precios de las {time}</span>}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-3">Cargando activos…</p>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el portafolio.'}
          onRetry={() => void refetch()}
        />
      ) : !p || holdings.length === 0 ? (
        <div className={`${CARD} p-5`}>
          <EmptyState
            title="Todavía no tenés activos"
            description="Cargá tu primera compra para empezar a ver tu portafolio."
            action={<Button onClick={() => navigate('/assets/new')}>Cargar activo</Button>}
          />
        </div>
      ) : (
        <>
          {/* Resumen dividido */}
          <div className={`${CARD} grid grid-cols-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]`}>
            <div className="col-span-2 border-b border-line px-4 py-3.5 md:col-span-1 md:border-b-0 md:border-r md:px-5 md:py-4">
              <p className="text-[13px] text-ink-2">Valor hoy</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-[26px] font-extrabold tabular-nums tracking-[-0.03em]">{money.format(total)}</span>
                <DayChip pct={p.dayChangePercent} testId="chip-hoy-activos" />
              </p>
              <p className="text-xs text-ink-3">{holdings.length} {holdings.length === 1 ? 'posición' : 'posiciones'}</p>
            </div>
            <div className="border-r border-line px-4 py-3.5 md:px-5 md:py-4">
              <p className="text-[13px] text-ink-2">Invertido</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{money.format(invested)}</p>
              <p className="text-xs text-ink-3">con comisiones</p>
            </div>
            <div className="px-4 py-3.5 md:px-5 md:py-4">
              <p className="text-[13px] text-ink-2">Resultado</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${p.pnlAbsolute >= 0 ? 'text-pos' : 'text-neg'}`}>
                {signedMoney(money.format, p.pnlAbsolute)}
              </p>
              <p className={`text-xs font-semibold tabular-nums ${p.pnlAbsolute >= 0 ? 'text-pos' : 'text-neg'}`}>{formatPctArrow(p.pnlPercent)}</p>
            </div>
          </div>

          {/* Chips por tipo + orden */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="-mx-4 flex basis-full gap-2 overflow-x-auto px-4 md:mx-0 md:flex-1 md:basis-auto md:flex-wrap md:px-0" role="group" aria-label="Filtrar por tipo">
              {(['all', ...TYPE_ORDER.filter((t) => counts.has(t))] as const).map((t) => {
                const on = filter === t
                const n = t === 'all' ? holdings.length : counts.get(t) ?? 0
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(t)}
                    className={`h-10 shrink-0 rounded-[20px] border px-3 text-[13px] font-semibold md:h-[34px] ${
                      on ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink hover:bg-muted'
                    }`}
                  >
                    {t === 'all' ? 'Todos' : assetTypeLabel[t]} <span className="opacity-60">{n}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <span id="ordenar-label" className="text-[12.5px] text-ink-3">Ordenar</span>
              <div role="radiogroup" aria-labelledby="ordenar-label" className="flex gap-[3px] rounded-[10px] bg-muted p-[3px]">
                {SORTS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={sort === o.id}
                    onClick={() => setSort(o.id)}
                    className={`h-[30px] rounded-[7px] px-3 text-[12.5px] font-semibold ${
                      sort === o.id ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]' : 'text-ink-3'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className={`${CARD} overflow-hidden`}>
            <div className="hidden grid-cols-[minmax(0,1.5fr)_96px_170px_minmax(0,1fr)_100px_96px_14px] gap-3 bg-canvas px-[18px] py-2.5 text-xs font-semibold text-ink-3 md:grid">
              <span>Activo</span>
              <span className="text-right">Cantidad</span>
              <span className="text-right">Compraste a → hoy</span>
              <span>Parte del total</span>
              <span className="text-right">Valor</span>
              <span className="text-right">Resultado</span>
              <span />
            </div>
            {visible.map((h) => (
              <HoldingRow
                key={h.assetId}
                holding={h}
                total={total}
                transactions={(transactions ?? []).filter((tx) => tx.assetId === h.assetId)}
                expanded={expanded === h.assetId}
                onToggle={() => toggle(h.assetId)}
                onDeletePosition={() => handleDeletePosition(h)}
              />
            ))}
          </div>
        </>
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

function HoldingRow({ holding: h, total, transactions, expanded, onToggle, onDeletePosition }: HoldingRowProps) {
  const money = useMoney()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const c = assetColor(h.asset.type as AssetType)
  const share = total > 0 ? (h.value / total) * 100 : 0
  const sinCot = sinCotizacion(h)
  const up = h.pnl >= 0
  const pnlClass = sinCot ? 'text-ink-3' : up ? 'text-pos' : 'text-neg'
  const qty = `${formatQuantity(h.quantity)} ${h.asset.symbol}`
  const panelId = `activo-${h.assetId}`
  const cargar = (kind: 'buy' | 'sell') =>
    navigate(`/assets/new?asset=${encodeURIComponent(h.asset.symbol)}&kind=${kind}&from=assets`)

  return (
    <div className={`border-t border-line first:border-t-0 md:first:border-t ${expanded ? 'bg-brand-tint' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto_14px] items-center gap-3 px-3.5 py-2.5 text-left text-[13.5px] transition-colors hover:bg-brand-tint md:grid-cols-[minmax(0,1.5fr)_96px_170px_minmax(0,1fr)_100px_96px_14px] md:px-[18px]"
      >
        <span className="flex min-w-0 items-center gap-[11px]">
          <AssetAvatar asset={h.asset} size={38} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{h.asset.name}</span>
            <span className="block truncate text-[11.5px] text-ink-3">
              <span className="md:hidden">
                {qty} · {Math.round(share)} % del total
              </span>
              <span className="hidden md:inline">
                {h.asset.symbol} ·{' '}
                <span style={{ color: theme === 'dark' ? c.accent : c.ink }}>{assetTypeLabel[h.asset.type as AssetType]}</span>
              </span>
            </span>
          </span>
        </span>
        <span className="hidden text-right tabular-nums md:block">{formatQuantity(h.quantity)}</span>
        <span className="hidden text-right tabular-nums text-ink-2 md:block">
          {money.format(h.avgPrice)} → {sinCot ? '—' : money.format(h.currentPrice)}
        </span>
        <span className="hidden items-center gap-2 md:flex">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${share}%`, background: c.accent }} />
          </span>
          <span className="w-9 text-right text-[11.5px] tabular-nums text-ink-3">{Math.round(share)} %</span>
        </span>
        <span className="text-right tabular-nums">
          <span className="block font-semibold">{sinCot ? '—' : money.format(h.value)}</span>
          {/* Variación del día del activo (GF-019); en mobile la fila ya muestra el resultado acá. */}
          <span className="mt-0.5 hidden md:block">
            <DayChip pct={sinCot ? null : h.dayChangePercent} size="sm" />
          </span>
          <span className={`block text-[12.5px] font-semibold md:hidden ${pnlClass}`}>{sinCot ? 'Sin cotización' : formatPctArrow(h.pnlPercent)}</span>
        </span>
        <span className={`hidden text-right tabular-nums md:block ${pnlClass}`}>
          {sinCot ? (
            <span className="text-[12.5px] font-semibold">Sin cotización</span>
          ) : (
            <>
              <span className="block font-semibold">{signedMoney(money.format, h.pnl)}</span>
              <span className="block text-xs font-semibold">{formatPctArrow(h.pnlPercent)}</span>
            </>
          )}
        </span>
        <span className="text-xs text-ink-3" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-3.5 px-3.5 pb-4 pt-1 md:px-[18px]">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              ['Precio promedio', money.format(h.avgPrice)],
              ['Precio hoy', sinCot ? '—' : money.format(h.currentPrice)],
              ['Invertido', money.format(h.avgPrice * h.quantity)],
              ['Resultado', sinCot ? 'Sin cotización' : `${signedMoney(money.format, h.pnl)}`],
            ].map(([label, value], i) => (
              <div key={label} className="rounded-[10px] border border-line bg-surface px-3 py-2.5">
                <p className="text-xs text-ink-3">{label}</p>
                <p className={`mt-0.5 text-sm font-semibold tabular-nums ${i === 3 ? pnlClass : ''}`}>{value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Operaciones · {transactions.length}</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-ink-3">Sin operaciones para este activo.</p>
            ) : (
              <div className="space-y-1.5">
                {transactions.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} symbol={h.asset.symbol} />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => cargar('buy')} className="h-10">+ Comprar más</Button>
            <Button variant="secondary" onClick={() => cargar('sell')} className="h-10">Vender</Button>
            <button
              type="button"
              onClick={onDeletePosition}
              className="ml-auto rounded-lg px-2.5 py-2 text-[13px] font-semibold text-neg hover:bg-neg-soft"
            >
              Eliminar posición…
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TransactionItem({ tx, symbol }: { tx: Transaction; symbol: string }) {
  const [editing, setEditing] = useState(false)
  if (editing) return <TransactionEditForm tx={tx} onClose={() => setEditing(false)} />
  const buy = tx.kind === 'buy'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-surface px-3 py-2 text-[13px]">
      <span className="w-[76px] tabular-nums text-ink-3">{formatDate(tx.purchasedAt)}</span>
      <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${buy ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'}`}>
        {buy ? 'Compra' : 'Venta'}
      </span>
      {/* El precio va en la moneda en que se hizo la operación: es el dato histórico. */}
      <span className="flex-1 tabular-nums">
        {formatQuantity(tx.quantity)} {symbol} a {formatCurrency(tx.unitPrice, tx.priceCurrency)}
      </span>
      <button type="button" onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-[13px] font-semibold text-brand-ink hover:bg-brand-tint">
        Editar
      </button>
    </div>
  )
}

function TransactionEditForm({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  const { toast } = useToast()
  const confirm = useConfirm()

  // En el rediseño la fila de la operación solo tiene «Editar»: borrar una
  // operación suelta se hace desde acá, con la confirmación de siempre.
  const handleDelete = () => {
    void confirm({
      title: 'Eliminar operación',
      message: '¿Eliminar esta operación? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTx.mutateAsync(tx.id)
          toast('Operación eliminada')
          onClose()
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo eliminar la operación.', 'error')
          throw err
        }
      },
    })
  }
  const [kind, setKind] = useState<'buy' | 'sell'>(tx.kind)
  const [quantity, setQuantity] = useState(String(tx.quantity))
  const [unitPrice, setUnitPrice] = useState(String(tx.unitPrice))
  const [priceCurrency, setPriceCurrency] = useState(tx.priceCurrency as PriceCurrency)
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
    if (purchasedAt.trim() !== '') input.purchasedAt = dateInputToISO(purchasedAt)
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
    <div className="space-y-3 rounded-[10px] border border-line bg-surface p-3">
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
              onChange={(e) => setPriceCurrency(e.target.value as PriceCurrency)}
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
        <Input label={kind === 'buy' ? 'Fecha de compra' : 'Fecha de venta'} value={purchasedAt} onChange={setPurchasedAt} type="date" max={isoToDateInput(new Date().toISOString())} />
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteTx.isPending}
          className="ml-auto rounded-lg px-2.5 text-[13px] font-semibold text-neg hover:bg-neg-soft"
        >
          Eliminar operación
        </button>
      </div>
    </div>
  )
}
