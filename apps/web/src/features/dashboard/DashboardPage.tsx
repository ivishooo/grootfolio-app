import { Link } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import { usePortfolio } from '@/lib/queries'
import { formatCompactNumber, formatPercent, formatShare, assetTypeLabels, assetTypeLabel } from '@grootfolio/shared'
import { useMoney } from '@/lib/money'
import type { AssetType } from '@grootfolio/shared'
import { themes } from '@grootfolio/tokens'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { assetColor } from '@/lib/asset-visual'
import { DashboardSkeleton } from './DashboardSkeleton'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

function AddAssetButton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <Link to="/assets/new">
      <Button size={size} className="inline-flex items-center gap-1.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Cargar activo
      </Button>
    </Link>
  )
}

/**
 * Etiqueta de porcentaje dentro de cada porción del gráfico de torta.
 *
 * Recharts, con `label` a secas, escribe el valor crudo del dato ("4944.48") en
 * el color de la serie: sobre el relleno naranja quedaba ilegible, y al
 * angostarse el gráfico se recortaba hasta dejar un solo caracter. Acá lo
 * dibujamos en blanco sobre el sector y mostramos el porcentaje, que es lo que
 * se lee de una torta; el importe exacto queda en el tooltip.
 *
 * Las porciones de menos de 6 % no se etiquetan: no entra el texto.
 */
function PieSliceLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if (
    !percent ||
    percent < 0.06 ||
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    midAngle === undefined
  ) {
    return null
  }
  const RAD = Math.PI / 180
  const inner = Number(innerRadius) || 0
  const outer = Number(outerRadius) || 0
  const radius = inner + (outer - inner) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RAD)
  const y = cy + radius * Math.sin(-midAngle * RAD)
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}
    >
      {Math.round(percent * 100)}%
    </text>
  )
}

export function DashboardPage() {
  const { theme: themeName } = useTheme()
  const t = themes[themeName]
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()
  const money = useMoney()

  const chartColors = [t.chart.series1, t.chart.series2, t.chart.series3, t.chart.series4]
  const pieData = (p?.distribution ?? []).map((d) => ({
    name: assetTypeLabels[d.type as AssetType] ?? d.type,
    value: d.value,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el portfolio.'}
          onRetry={() => void refetch()}
        />
      ) : !p ? null : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Valor total"
              value={money.format(p.totalValue)}
              delta={formatPercent(p.pnlPercent)}
              positive={p.pnlPercent === null ? null : p.pnlPercent >= 0}
              hint={money.currency !== 'USD' ? `Convertido a ${money.currency}` : undefined}
            />
            <StatCard
              label="Ganancia / Pérdida"
              value={money.format(p.pnlAbsolute)}
              delta={formatPercent(p.pnlPercent)}
              positive={p.pnlPercent === null ? null : p.pnlAbsolute >= 0}
            />
            <StatCard
              label="Mejor activo"
              value={p.bestAsset?.name ?? '—'}
              delta={p.bestAsset ? formatPercent(p.bestAsset.pnlPercent) : ''}
              positive={
                p.bestAsset?.pnlPercent === null || p.bestAsset?.pnlPercent === undefined
                  ? null
                  : p.bestAsset.pnlPercent >= 0
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Distribución del Portafolio">
              {pieData.length === 0 ? (
                <EmptyState title="Sin datos para mostrar" description="Cargá activos para ver la distribución." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      labelLine={false}
                      label={PieSliceLabel}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [money.format(v as number), n as string]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Rendimiento mensual">
              {p.monthlyReturn.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="El rendimiento mensual se mostrará cuando haya datos históricos." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={p.monthlyReturn}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.border.default} />
                    <XAxis dataKey="month" tick={{ fill: t.text.secondary, fontSize: 12 }} />
                    <YAxis tick={{ fill: t.text.secondary, fontSize: 12 }} tickFormatter={(v: number) => formatCompactNumber(money.convert(v))} width={56} />
                    <Tooltip formatter={(v) => money.format(v as number)} />
                    <Bar dataKey="value" fill={t.chart.series1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Mis Activos <span className="font-medium text-neutral-400">· {p.holdings.length}</span>
              </h3>
              {p.holdings.length > 0 && <AddAssetButton size="sm" />}
            </div>

            {p.holdings.length === 0 ? (
              <EmptyState
                title="Todavía no tenés activos"
                description="Cargá tu primera transacción para empezar a ver tu portafolio."
                action={<AddAssetButton />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Activo</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cantidad</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Precio prom.</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Precio actual</th>
                      <th className="whitespace-nowrap px-3 py-2 text-left font-medium">% Cartera</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Valor</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Rentabilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.holdings.map((h) => {
                      const c = assetColor(h.asset.type)
                      const pct = p.totalValue > 0 ? (h.value / p.totalValue) * 100 : 0
                      const up = h.pnl >= 0
                      return (
                        <tr key={h.assetId} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <AssetAvatar asset={h.asset} size={30} />
                              <div>
                                <div className="font-semibold">{h.asset.name}</div>
                                <div className="text-[11px] font-semibold tracking-wide text-neutral-400">{h.asset.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: c.accent, background: c.soft }}>
                              {assetTypeLabel[h.asset.type as AssetType] ?? h.asset.type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{h.quantity}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-500">{money.format(h.avgPrice)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-500">{money.format(h.currentPrice)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex min-w-[110px] items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.accent }} />
                              </div>
                              <span className="text-[11px] tabular-nums text-neutral-400">{formatShare(pct)}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{money.format(h.value)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                            <div className={`font-semibold ${up ? 'text-success-500' : 'text-danger-500'}`}>{money.format(h.pnl)}</div>
                            <div className={`text-[11px] ${up ? 'text-success-500' : 'text-danger-500'}`}>{formatPercent(h.pnlPercent)}</div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
