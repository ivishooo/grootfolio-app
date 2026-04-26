/**
 * Dashboard - resumen global del portafolio.
 * Implementar segun Figma "02 - Dashboard - Desktop".
 * Datos mock en /mocks/portfolio.ts. Ver docs/CLAUDE_CODE_PLAN.md Fase 3.
 */
import { mockPortfolio } from '@/mocks/portfolio'
import { formatCurrency, formatPercent } from '@grootfolio/shared'

export function DashboardPage() {
  const p = mockPortfolio
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Valor Total" value={formatCurrency(p.totalValue)} delta={formatPercent(p.pnlPercent)} />
        <StatCard label="Ganancia/Perdida" value={formatCurrency(p.pnlAbsolute)} delta="Este mes" positive />
        <StatCard label="Mejor Activo" value={p.bestAsset?.name ?? '-'} delta={formatPercent(p.pnlPercent)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Distribucion del Portafolio">
          <div className="h-64 grid place-items-center text-neutral-500">[Pie chart recharts]</div>
        </Card>
        <Card title="Rendimiento (Enero - Junio)">
          <div className="h-64 grid place-items-center text-neutral-500">[Bar chart recharts]</div>
        </Card>
      </div>
      <Card title="Mis Activos">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2">Activo</th><th>Tipo</th><th>Cantidad</th><th>Valor</th><th>Variacion</th><th>Rentabilidad</th>
              </tr>
            </thead>
            <tbody>
              {p.holdings.map((h) => (
                <tr key={h.assetId} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="py-2">{h.asset.name}</td>
                  <td>{h.asset.type}</td>
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
      <div className={`mt-1 text-xs ${positive ? 'text-success-500' : 'text-neutral-500'}`}>{delta}</div>
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
