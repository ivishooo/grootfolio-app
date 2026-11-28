/**
 * Inicio (rediseño v2, Fase 4). SPEC-pantallas › Inicio.
 *
 * - Saludo con la fecha y la hora en que se trajeron los precios.
 * - KPI: valor total (hero), ganancia total y mejor activo.
 * - «Cómo está repartido» como barra apilada (ya no hay torta) y «Valor del
 *   portafolio · últimos 6 meses».
 * - «Mis activos» con 5 filas; tocar una abre Activos con esa fila expandida.
 *
 * - Chip «▲ 1,2 % hoy» junto al valor total, con `dayChangePercent` de GET
 *   /portfolio (GF-019); sin dato no se dibuja.
 *
 * Lo que el prototipo muestra y la API todavía no da no se dibuja: el segmentado
 * 1D / 1S / 1M / 1A necesita que el histórico se pueda pedir por período.
 */
import { Link, useNavigate } from 'react-router-dom'
import { usePortfolio } from '@/lib/queries'
import { useAuth } from '@/auth/AuthProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { formatCompactNumber, formatPctArrow, formatPercent, assetTypeLabel, assetTypeLabels } from '@grootfolio/shared'
import type { AssetType, Holding } from '@grootfolio/shared'
import { useMoney, signedMoney } from '@/lib/money'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AssetAvatar } from '@/components/ui/AssetAvatar'
import { DayChip } from '@/components/ui/DayChip'
import { assetColor } from '@/lib/asset-visual'
import { DashboardSkeleton } from './DashboardSkeleton'

const CARD = 'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none'

function firstName(fullName: string | null | undefined): string | null {
  const n = fullName?.trim().split(/\s+/)[0]
  return n || null
}

/** «jue 26 nov · precios de las 20:51» */
function pricesStamp(updatedAt: number): string {
  const d = new Date(updatedAt)
  const day = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', '')
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} · precios de las ${time}`
}

function AddAssetButton() {
  return (
    <Link
      to="/assets/new"
      className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Cargar activo
    </Link>
  )
}

function HoldingRow({ h, total }: { h: Holding; total: number }) {
  const navigate = useNavigate()
  const money = useMoney()
  const { theme } = useTheme()
  const c = assetColor(h.asset.type as AssetType)
  const share = total > 0 ? (h.value / total) * 100 : 0
  const up = h.pnlPercent === null ? null : h.pnlPercent >= 0
  return (
    <button
      type="button"
      onClick={() => navigate(`/assets?open=${encodeURIComponent(h.assetId)}`)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-1 py-3 text-left text-[13.5px] transition-colors hover:bg-brand-tint md:grid-cols-[minmax(0,1.6fr)_90px_110px_minmax(0,1fr)_120px]"
    >
      <span className="flex min-w-0 items-center gap-[11px]">
        <AssetAvatar asset={h.asset} size={34} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{h.asset.name}</span>
          <span className="block text-[11.5px] text-ink-3">{h.asset.symbol}</span>
        </span>
      </span>
      <span className="hidden justify-self-start md:block">
        <span
          className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
          style={{ background: c.soft, color: theme === 'dark' ? c.accent : c.ink }}
        >
          {assetTypeLabel[h.asset.type as AssetType] ?? h.asset.type}
        </span>
      </span>
      <span className="hidden text-right tabular-nums text-ink-2 md:block">{h.currentPrice > 0 ? money.format(h.currentPrice) : '—'}</span>
      <span className="hidden items-center gap-2 md:flex">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full" style={{ width: `${share}%`, background: c.accent }} />
        </span>
        <span className="w-10 text-right text-[11.5px] tabular-nums text-ink-3">{Math.round(share)} %</span>
      </span>
      <span className="text-right tabular-nums">
        <span className="block font-semibold">{h.value > 0 ? money.format(h.value) : '—'}</span>
        <span className={`block text-[12px] font-semibold ${up === null ? 'text-ink-3' : up ? 'text-pos' : 'text-neg'}`}>
          {up === null ? 'Sin cotización' : formatPctArrow(h.pnlPercent)}
        </span>
      </span>
    </button>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: p, isLoading, isError, error, refetch, dataUpdatedAt } = usePortfolio()
  const money = useMoney()
  const name = firstName(user?.fullName)

  const months = (p?.monthlyReturn ?? []).slice(-6)
  const maxMonth = Math.max(1, ...months.map((m) => m.value))
  const holdings = [...(p?.holdings ?? [])].sort((a, b) => b.value - a.value)
  const dist = (p?.distribution ?? [])
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((d) => ({
      type: d.type as AssetType,
      value: d.value,
      pct: p && p.totalValue > 0 ? (d.value / p.totalValue) * 100 : 0,
    }))

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <div>
        {dataUpdatedAt > 0 && <p className="mb-1.5 font-mono text-[11.5px] font-medium text-ink-3">{pricesStamp(dataUpdatedAt)}</p>}
        <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">{name ? `Hola, ${name}` : 'Hola de nuevo'}</h1>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el portafolio.'}
          onRetry={() => void refetch()}
        />
      ) : !p ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className={`${CARD} col-span-2 p-5 md:col-span-1`}>
              <p className="text-[13px] text-ink-2">Valor total</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p data-testid="stat-valor-total" className="text-[32px] font-extrabold tabular-nums tracking-[-0.03em] md:text-[34px]">
                  {money.format(p.totalValue)}
                </p>
                <DayChip pct={p.dayChangePercent} testId="chip-hoy" />
              </div>
              {money.currency !== 'USD' && <p className="mt-2 text-[12.5px] text-ink-3">Convertido a {money.currency}</p>}
            </div>
            <div className={`${CARD} p-3.5 md:p-5`}>
              <p className="text-[13px] text-ink-2">Ganancia total</p>
              <p className={`mt-1.5 text-lg font-bold tabular-nums tracking-[-0.02em] md:text-[22px] ${p.pnlAbsolute >= 0 ? 'text-pos' : 'text-neg'}`}>
                {signedMoney(money.format, p.pnlAbsolute)}
              </p>
              <p className="mt-1 text-xs tabular-nums text-ink-3">
                {p.pnlPercent === null ? 'Sin base de costo' : `${formatPercent(p.pnlPercent).replace('%', ' %')} sobre lo invertido`}
              </p>
            </div>
            <div className={`${CARD} p-3.5 md:p-5`}>
              <p className="text-[13px] text-ink-2">Mejor activo</p>
              <p className="mt-1.5 truncate text-lg font-bold tracking-[-0.02em] md:text-[22px]">{p.bestAsset?.name ?? '—'}</p>
              {p.bestAsset && (
                <p className={`mt-1 text-xs font-semibold tabular-nums ${(p.bestAsset.pnlPercent ?? 0) >= 0 ? 'text-pos' : 'text-neg'}`}>
                  {formatPctArrow(p.bestAsset.pnlPercent)}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <section className={`${CARD} p-5`}>
              <h2 className="mb-3.5 text-[15px] font-semibold">Cómo está repartido</h2>
              {dist.length === 0 ? (
                <EmptyState title="Sin datos para mostrar" description="Cargá activos para ver cómo se reparte tu portafolio." />
              ) : (
                <>
                  <div className="flex h-3.5 gap-[3px] overflow-hidden rounded-[7px]" role="img" aria-label={dist.map((d) => `${assetTypeLabels[d.type]} ${Math.round(d.pct)} %`).join(', ')}>
                    {dist.map((d) => (
                      <div key={d.type} className="rounded-[3px]" style={{ width: `${d.pct}%`, background: assetColor(d.type).accent }} />
                    ))}
                  </div>
                  <ul className="mt-4 grid gap-2.5">
                    {dist.map((d) => (
                      <li key={d.type} className="flex items-center gap-2.5 text-[13.5px]">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: assetColor(d.type).accent }} />
                        <span className="flex-1">{assetTypeLabels[d.type]}</span>
                        <span className="tabular-nums text-ink-2">{money.format(d.value)}</span>
                        <span className="w-[46px] text-right font-semibold tabular-nums">{Math.round(d.pct)} %</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className={`${CARD} p-5`}>
              <div className="mb-3.5 flex items-baseline gap-2">
                <h2 className="flex-1 text-[15px] font-semibold">Valor del portafolio</h2>
                <span className="text-xs text-ink-3">últimos 6 meses</span>
              </div>
              {months.length === 0 ? (
                <EmptyState title="Sin histórico aún" description="El valor mes a mes aparece cuando haya datos históricos." />
              ) : (
                <>
                  <div className="flex h-[150px] items-end gap-3.5 border-b border-line pb-1">
                    {months.map((m, i) => {
                      const last = i === months.length - 1
                      return (
                        <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                          <span className="text-[10.5px] tabular-nums text-ink-3">{formatCompactNumber(money.convert(m.value))}</span>
                          <div
                            className="w-full max-w-[44px] rounded-[6px_6px_2px_2px]"
                            style={{
                              height: `${Math.max(2, Math.round((m.value / maxMonth) * 86))}%`,
                              background: last ? '#F97316' : 'color-mix(in srgb, #F97316 35%, transparent)',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-1.5 flex gap-3.5">
                    {months.map((m) => (
                      <span key={m.month} className="flex-1 text-center text-[11.5px] text-ink-3">{m.month}</span>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <section className={`${CARD} px-5 pb-2 pt-[18px]`}>
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="flex-1 text-[15px] font-semibold">
                Mis activos <span className="font-medium text-ink-3">· {holdings.length}</span>
              </h2>
              {holdings.length > 0 && (
                <Link to="/assets" className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-ink hover:bg-brand-tint">
                  Ver todos →
                </Link>
              )}
            </div>
            {holdings.length === 0 ? (
              <EmptyState
                title="Todavía no tenés activos"
                description="Cargá tu primera compra para empezar a ver tu portafolio."
                action={<AddAssetButton />}
              />
            ) : (
              holdings.slice(0, 5).map((h) => <HoldingRow key={h.assetId} h={h} total={p.totalValue} />)
            )}
          </section>
        </>
      )}
    </div>
  )
}
