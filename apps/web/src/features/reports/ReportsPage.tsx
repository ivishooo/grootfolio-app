/**
 * Reportes (GF-250, Fase F): P&L realizado (total, por activo y serie
 * acumulada), balance historico mark-to-market y ledger completo valuado en USD.
 */
import { useTheme } from '@/theme/ThemeProvider'
import { useReportSummary, useReportLedger } from '@/lib/queries'
import { formatCurrency, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import { themes } from '@grootfolio/tokens'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function ReportsPage() {
  const { theme: themeName } = useTheme()
  const t = themes[themeName]
  const summaryQ = useReportSummary()
  const ledgerQ = useReportLedger()

  const s = summaryQ.data
  const ledger = ledgerQ.data ?? []

  const realizedSeries = (s?.realizedSeries ?? []).map((p) => ({
    date: formatDate(p.date),
    value: p.cumulative,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reportes</h2>

      {summaryQ.isLoading ? (
        <p className="text-sm text-neutral-500">Cargando reportes…</p>
      ) : summaryQ.isError ? (
        <ErrorState
          message={summaryQ.error instanceof Error ? summaryQ.error.message : 'No se pudo cargar el reporte.'}
          onRetry={() => void summaryQ.refetch()}
        />
      ) : !s ? null : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="P&L Realizado"
              value={formatCurrency(s.realizedTotal)}
              positive={s.realizedTotal >= 0}
            />
            <StatCard label="Ventas registradas" value={String(s.realizedSeries.length)} />
            <StatCard label="Activos operados" value={String(s.realizedByAsset.length)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="P&L realizado acumulado">
              {realizedSeries.length === 0 ? (
                <EmptyState title="Sin ventas aún" description="El P&L realizado aparece cuando vendés (total o parcial)." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={realizedSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.border.default} />
                    <XAxis dataKey="date" tick={{ fill: t.text.secondary, fontSize: 12 }} />
                    <YAxis tick={{ fill: t.text.secondary, fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Line type="monotone" dataKey="value" stroke={t.chart.series1} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Balance histórico (mark-to-market)">
              {s.historicalBalance.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="Se muestra cuando hay snapshots históricos (crypto)." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={s.historicalBalance}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.border.default} />
                    <XAxis dataKey="month" tick={{ fill: t.text.secondary, fontSize: 12 }} />
                    <YAxis tick={{ fill: t.text.secondary, fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Bar dataKey="value" fill={t.chart.series2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card title="P&L realizado por activo">
            {s.realizedByAsset.length === 0 ? (
              <EmptyState title="Sin posiciones cerradas" description="Acá vas a ver la ganancia realizada de lo que vendiste, incluso de activos que ya no tenés." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="w-full px-3 py-2 text-left font-medium">Activo</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cant. vendida</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Ingresos</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Costo</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Realizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.realizedByAsset.map((r) => (
                      <tr key={r.assetId} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-neutral-500">{assetTypeLabel[r.type as AssetType] ?? r.type}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.quantitySold}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(r.proceeds)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(r.costBasis)}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${r.realized >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{formatCurrency(r.realized)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Ledger de operaciones">
            {ledgerQ.isLoading ? (
              <p className="text-sm text-neutral-500">Cargando operaciones…</p>
            ) : ledger.length === 0 ? (
              <EmptyState title="Sin operaciones" description="Cargá transacciones para ver el ledger." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="w-full px-3 py-2 text-left font-medium">Activo</th>
                      <th className="px-3 py-2 text-left font-medium">Op.</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cantidad</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Precio</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Monto USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e) => (
                      <tr key={e.id} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatDate(e.purchasedAt)}</td>
                        <td className="px-3 py-2 font-medium">{e.name}</td>
                        <td className={`px-3 py-2 font-medium ${e.kind === 'buy' ? 'text-success-500' : 'text-danger-500'}`}>{e.kind === 'buy' ? 'Compra' : 'Venta'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{e.quantity}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {e.unitPrice} {e.priceCurrency}
                          {e.usdApprox && <span title="FX aproximado a la fecha" className="ml-1 text-neutral-400">≈</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(e.amountUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <p className="text-xs text-neutral-400">
            Nota: el balance histórico y los precios de cierre usan datos de crypto (CoinGecko);
            acciones y bonos se incorporarán cuando esos proveedores tengan histórico. El símbolo ≈
            marca operaciones cuyo tipo de cambio es una aproximación a la fecha.
          </p>
        </>
      )}
    </div>
  )
}
