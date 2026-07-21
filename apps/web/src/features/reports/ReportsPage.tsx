/**
 * Reportes (GF-250) — rediseño. P&L realizado (stat cards con acento), gráficos
 * (recharts), y tablas con avatares por tipo de activo y chips de operación.
 */
import { useTheme } from '@/theme/ThemeProvider'
import { useReportSummary, useReportLedger } from '@/lib/queries'
import { formatCurrency, formatPercent, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import { themes } from '@grootfolio/tokens'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function ReportStat({
  icon, iconColor, iconBg, label, value, valueColor, sub,
}: {
  icon: string; iconColor: string; iconBg: string; label: string
  value: string; valueColor?: string; sub?: string
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span className="grid h-6 w-6 place-items-center rounded-lg text-[13px]" style={{ background: iconBg, color: iconColor }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2.5 text-2xl font-bold tabular-nums" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  )
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
      <div>
        <h2 className="text-2xl font-bold">Reportes</h2>
        <p className="mt-1 text-sm text-neutral-500">Ganancia realizada, balance histórico y ledger de operaciones.</p>
      </div>

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
            <ReportStat
              icon="↗" iconColor="#16A34A" iconBg="rgba(34,197,94,0.12)"
              label="P&L Realizado"
              value={formatCurrency(s.realizedTotal)}
              valueColor={s.realizedTotal >= 0 ? '#16A34A' : '#DC2626'}
              sub="Sobre posiciones cerradas"
            />
            <ReportStat
              icon="⇄" iconColor="#3B82F6" iconBg="rgba(59,130,246,0.12)"
              label="Ventas registradas"
              value={String(s.realizedSeries.length)}
              sub="Posiciones cerradas total o parcial"
            />
            <ReportStat
              icon="◈" iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.12)"
              label="Activos operados"
              value={String(s.realizedByAsset.length)}
              sub="Incluye activos que ya no tenés"
            />
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
                    <Line type="monotone" dataKey="value" stroke={t.chart.series1} strokeWidth={2.5} dot={false} />
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
                      <th className="px-3 py-2 text-left font-medium">Activo</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cant. vendida</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Ingresos</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Costo</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Realizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.realizedByAsset.map((r) => {
                      const c = assetColor(r.type)
                      const up = r.realized >= 0
                      const pct = r.costBasis ? (r.realized / r.costBasis) * 100 : 0
                      return (
                        <tr key={r.assetId} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <AssetAvatar asset={{ symbol: r.symbol, name: r.name, type: r.type }} size={30} />
                              <div>
                                <div className="font-semibold">{r.name}</div>
                                <div className="text-[11px] font-semibold tracking-wide text-neutral-400">{r.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: c.accent, background: c.soft }}>
                              {assetTypeLabel[r.type as AssetType] ?? r.type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{r.quantitySold}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-500">{formatCurrency(r.proceeds)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-500">{formatCurrency(r.costBasis)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                            <div className={`font-semibold ${up ? 'text-success-500' : 'text-danger-500'}`}>{formatCurrency(r.realized)}</div>
                            <div className={`text-[11px] ${up ? 'text-success-500' : 'text-danger-500'}`}>{formatPercent(pct)}</div>
                          </td>
                        </tr>
                      )
                    })}
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
                      <th className="px-3 py-2 text-left font-medium">Activo</th>
                      <th className="px-3 py-2 text-left font-medium">Operación</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cantidad</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Precio</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Monto USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e) => {
                      const buy = e.kind === 'buy'
                      const kc = buy ? '#16A34A' : '#DC2626'
                      const ks = buy ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
                      return (
                        <tr key={e.id} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="whitespace-nowrap px-3 py-2.5 text-neutral-500">{formatDate(e.purchasedAt)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <AssetAvatar asset={{ symbol: e.symbol, name: e.name, type: e.type }} size={26} />
                              <span className="font-semibold">{e.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: kc, background: ks }}>
                              {buy ? '↓' : '↑'} {buy ? 'Compra' : 'Venta'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{e.quantity}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-500">
                            {e.unitPrice} {e.priceCurrency}
                            {e.usdApprox && <span title="FX aproximado a la fecha" className="ml-1 text-neutral-400">≈</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(e.amountUsd)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div
            className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
            style={{ borderColor: 'color-mix(in srgb, #3B82F6 20%, transparent)', background: 'color-mix(in srgb, #3B82F6 7%, transparent)' }}
          >
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#3B82F6] text-[11px] font-bold italic text-white">i</span>
            <p className="text-xs leading-relaxed text-neutral-500">
              El balance histórico y los precios de cierre usan datos de crypto (CoinGecko); acciones y bonos se
              incorporarán cuando esos proveedores tengan histórico. El símbolo <strong className="text-neutral-600 dark:text-neutral-300">≈</strong> marca
              operaciones cuyo tipo de cambio es una aproximación a la fecha.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
