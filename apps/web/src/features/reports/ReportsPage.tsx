/**
 * Reportes (rediseño v2, Fase 5). SPEC-pantallas › Reportes.
 *
 * - KPI: «Ganancia realizada · {año}», «Ventas» y «Activos operados».
 * - «Ganancia realizada acumulada»: una barra por venta, la última en sólido.
 * - «Operaciones» como lista, con «Exportar CSV» (se arma en el cliente con el
 *   mismo ledger que se muestra).
 * - La nota de fuentes es una línea de texto, sin caja.
 *
 * Respecto de la versión anterior se sacan el «Balance histórico» (el valor mes
 * a mes ya está en Inicio) y la tabla «P&L realizado por activo» (lo realizado
 * se ve venta por venta en las barras y en la lista).
 */
import { useReportSummary, useReportLedger } from '@/lib/queries'
import { formatCompactNumber, formatCurrency, formatDate, formatQuantity } from '@grootfolio/shared'
import type { LedgerEntry } from '@grootfolio/shared'
import { useMoney, signedMoney } from '@/lib/money'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'

const CARD = 'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none'

/** «30/10» */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })

function exportCsv(ledger: LedgerEntry[], currency: string, convert: (usd: number) => number) {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const rows = [
    ['Fecha', 'Activo', 'Símbolo', 'Operación', 'Cantidad', 'Precio', 'Moneda del precio', `Monto (${currency})`],
    ...ledger.map((e) => [
      formatDate(e.purchasedAt),
      e.name,
      e.symbol,
      e.kind === 'buy' ? 'Compra' : 'Venta',
      String(e.quantity),
      String(e.unitPrice),
      e.priceCurrency,
      convert(e.amountUsd).toFixed(2),
    ]),
  ]
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `grootfolio-operaciones-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const money = useMoney()
  const summaryQ = useReportSummary()
  const ledgerQ = useReportLedger()
  const s = summaryQ.data
  const ledger = ledgerQ.data ?? []

  const year = new Date().getFullYear()
  const series = s?.realizedSeries ?? []
  const before = series.filter((p) => new Date(p.date).getFullYear() < year).at(-1)?.cumulative ?? 0
  const thisYear = series.filter((p) => new Date(p.date).getFullYear() === year)
  const realizedYear = (thisYear.at(-1)?.cumulative ?? before) - before
  const traded = new Set(ledger.map((e) => e.assetId)).size
  const maxBar = Math.max(1, ...series.map((p) => Math.abs(p.cumulative)))

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Reportes</h1>

      {summaryQ.isLoading ? (
        <p className="text-sm text-ink-3">Cargando reportes…</p>
      ) : summaryQ.isError ? (
        <ErrorState
          message={summaryQ.error instanceof Error ? summaryQ.error.message : 'No se pudo cargar el reporte.'}
          onRetry={() => void summaryQ.refetch()}
        />
      ) : !s ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className={`${CARD} col-span-2 p-5 md:col-span-1`}>
              <p className="text-[13px] text-ink-2">Ganancia realizada · {year}</p>
              <p className={`mt-1.5 text-[26px] font-extrabold tabular-nums tracking-[-0.03em] ${realizedYear >= 0 ? 'text-pos' : 'text-neg'}`}>
                {signedMoney(money.format, realizedYear)}
              </p>
              <p className="mt-1 text-xs text-ink-3">De lo que ya vendiste</p>
            </div>
            <div className={`${CARD} p-3.5 md:p-5`}>
              <p className="text-[13px] text-ink-2">Ventas</p>
              <p className="mt-1.5 text-lg font-bold tabular-nums md:text-[22px]">{series.length}</p>
              <p className="mt-1 text-xs text-ink-3">totales o parciales</p>
            </div>
            <div className={`${CARD} p-3.5 md:p-5`}>
              <p className="text-[13px] text-ink-2">Activos operados</p>
              <p className="mt-1.5 text-lg font-bold tabular-nums md:text-[22px]">{traded}</p>
              <p className="mt-1 text-xs text-ink-3">incluye los que ya no tenés</p>
            </div>
          </div>

          <section className={`${CARD} p-5`}>
            <h2 className="mb-3.5 text-[15px] font-semibold">Ganancia realizada acumulada</h2>
            {series.length === 0 ? (
              <EmptyState title="Sin ventas aún" description="La ganancia realizada aparece cuando vendés, total o parcialmente." />
            ) : (
              <div className="overflow-x-auto">
                <div className="flex min-w-full items-end gap-3" style={{ width: `${Math.max(series.length * 52, 0)}px` }}>
                  {series.map((p, i) => {
                    const last = i === series.length - 1
                    const color = p.cumulative >= 0 ? '#16A34A' : '#DC2626'
                    return (
                      <div key={`${p.date}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className="text-[10.5px] tabular-nums text-ink-3">{formatCompactNumber(money.convert(p.cumulative))}</span>
                        <div className="flex h-[120px] w-full items-end justify-center border-b border-line">
                          <div
                            className="w-full max-w-16 rounded-[6px_6px_2px_2px]"
                            style={{
                              height: `${Math.max(3, Math.round((Math.abs(p.cumulative) / maxBar) * 100))}%`,
                              background: last ? color : `color-mix(in srgb, ${color} 35%, transparent)`,
                            }}
                          />
                        </div>
                        <span className="text-[11.5px] text-ink-3">{shortDate(p.date)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <section className={`${CARD} px-5 pb-2 pt-[18px]`}>
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="flex-1 text-[15px] font-semibold">
                Operaciones <span className="font-medium text-ink-3">· {ledger.length}</span>
              </h2>
              {ledger.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportCsv(ledger, money.currency, money.convert)}
                  className="h-8 rounded-lg border border-ctl bg-surface px-3 text-[13px] font-semibold hover:bg-muted"
                >
                  Exportar CSV
                </button>
              )}
            </div>
            {ledgerQ.isLoading ? (
              <p className="py-3 text-sm text-ink-3">Cargando operaciones…</p>
            ) : ledger.length === 0 ? (
              <EmptyState title="Sin operaciones" description="Cargá una compra o una venta para verla acá." />
            ) : (
              ledger.map((e) => {
                const buy = e.kind === 'buy'
                return (
                  <div key={e.id} className="flex items-center gap-3 border-t border-line py-3 text-[13.5px]">
                    <AssetAvatar asset={{ symbol: e.symbol, name: e.name, type: e.type }} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.name}</p>
                      {/* El precio va en la moneda de la operación; el monto, en la de visualización. */}
                      <p className="truncate text-xs tabular-nums text-ink-3">
                        {shortDate(e.purchasedAt)} · {formatQuantity(e.quantity)} u a {formatCurrency(e.unitPrice, e.priceCurrency)}
                        {e.usdApprox && <span title="Tipo de cambio aproximado a la fecha"> ≈</span>}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${buy ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'}`}>
                      {buy ? 'Compra' : 'Venta'}
                    </span>
                    <span className="w-20 text-right font-semibold tabular-nums md:w-[110px]">{money.format(e.amountUsd)}</span>
                  </div>
                )
              })
            )}
          </section>

          <p className="text-[12.5px] leading-relaxed text-ink-3">
            Los precios históricos salen de CoinGecko (cripto); acciones y bonos se suman cuando esos proveedores tengan histórico. El
            símbolo ≈ marca operaciones con tipo de cambio aproximado a la fecha.
          </p>
        </>
      )}
    </div>
  )
}
