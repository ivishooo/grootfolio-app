import { mockPortfolio } from '@/mocks/portfolio'
import { useTheme } from '@/theme/ThemeProvider'
import { formatCurrency, formatPercent } from '@grootfolio/shared'
import { themes } from '@grootfolio/tokens'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const TYPE_LABELS: Record<string, string> = {
  crypto: 'Criptomonedas',
  stock: 'Acciones',
  bond: 'Bonos',
  currency: 'Divisas',
}

export function DashboardPage() {
  const p = mockPortfolio
  const { theme: themeName } = useTheme()
  const t = themes[themeName]
  const chartColors = [t.chart.series1, t.chart.series2, t.chart.series3, t.chart.series4]

  const pieData = p.distribution.map((d) => ({ name: TYPE_LABELS[d.type] ?? d.type, value: d.value }))
  const barData = p.monthlyReturn

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Valor Total" value={formatCurrency(p.totalValue)} delta={formatPercent(p.pnlPercent)} positive />
        <StatCard label="Ganancia/Perdida" value={formatCurrency(p.pnlAbsolute)} delta="Este mes" positive={p.pnlAbsolute >= 0} />
        <StatCard label="Mejor Activo" value={p.bestAsset?.name ?? '-'} delta={formatPercent(p.pnlPercent)} positive />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Distribucion del Portafolio">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label labelLine={false} style={{ fontSize: 12 }}>
                {pieData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Rendimiento (Enero - Junio)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border.default} />
              <XAxis dataKey="month" tick={{ fill: t.text.secondary, fontSize: 12 }} />
              <YAxis tick={{ fill: t.text.secondary, fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar dataKey="value" fill={t.chart.series1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Mis Activos">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2">Activo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Valor</th>
                <th>Variacion</th>
                <th>Rentabilidad</th>
              </tr>
            </thead>
            <tbody>
              {p.holdings.map((h) => (
                <tr key={h.assetId} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="py-2 font-medium">{h.asset.name}</td>
                  <td className="text-neutral-500">{TYPE_LABELS[h.asset.type] ?? h.asset.type}</td>
                  <td>{h.quantity}</td>
                  <td>{formatCurrency(h.value)}</td>
                  <td className={h.pnlPercent >= 0 ? 'text-success-500' : 'text-danger-500'}>{formatPercent(h.pnlPercent)}</td>
                  <td className={h.pnl >= 0 ? 'text-success-500' : 'text-danger-500'}>{formatCurrency(h.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatCard({ label, value, delta, positive }: { label: string; value: string; delta: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className={`mt-1 text-xs ${positive ? 'text-success-500' : 'text-danger-500'}`}>{delta}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </div>
  )
}
