import { Link } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import { usePortfolio } from '@/lib/queries'
import { formatCurrency, formatPercent, assetTypeLabels, assetTypeLabel } from '@grootfolio/shared'
import type { AssetType } from '@grootfolio/shared'
import { themes } from '@grootfolio/tokens'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { DashboardSkeleton } from './DashboardSkeleton'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

export function DashboardPage() {
  const { theme: themeName } = useTheme()
  const t = themes[themeName]
  const { data: p, isLoading, isError, error, refetch } = usePortfolio()

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
            <StatCard label="Valor Total" value={formatCurrency(p.totalValue)} delta={formatPercent(p.pnlPercent)} positive={p.pnlPercent >= 0} />
            <StatCard label="Ganancia/Perdida" value={formatCurrency(p.pnlAbsolute)} delta={formatPercent(p.pnlPercent)} positive={p.pnlAbsolute >= 0} />
            <StatCard label="Mejor Activo" value={p.bestAsset?.name ?? '—'} delta={p.bestAsset ? formatPercent(p.bestAsset.pnlPercent) : ''} positive={(p.bestAsset?.pnlPercent ?? 0) >= 0} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Distribución del Portafolio">
              {pieData.length === 0 ? (
                <EmptyState title="Sin datos para mostrar" description="Cargá activos para ver la distribución." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label labelLine={false} style={{ fontSize: 12 }}>
                      {pieData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
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
                    <YAxis tick={{ fill: t.text.secondary, fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Bar dataKey="value" fill={t.chart.series1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card title="Mis Activos">
            {p.holdings.length === 0 ? (
              <EmptyState
                title="Todavía no tenés activos"
                description="Cargá tu primera transacción para empezar a ver tu portafolio."
                action={
                  <Link to="/assets/new">
                    <Button>Cargar activo</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="w-full px-3 py-2 text-left font-medium">Activo</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cantidad</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Valor</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Variación</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Rentabilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.holdings.map((h) => (
                      <tr key={h.assetId} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2 font-medium">{h.asset.name}</td>
                        <td className="px-3 py-2 text-neutral-500">{assetTypeLabel[h.asset.type as AssetType] ?? h.asset.type}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{h.quantity}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(h.value)}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${h.pnlPercent >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{formatPercent(h.pnlPercent)}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${h.pnl >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{formatCurrency(h.pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <Link to="/assets/new">
                    <Button>Cargar activo</Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
