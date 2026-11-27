/**
 * Groot en web (rediseño v2, ADR-0006): reemplaza al launcher del asistente.
 * Columna fija abajo a la derecha: la burbuja arriba y el avatar abajo.
 *
 * - Tocar el avatar: otro mensaje de ánimo, con parpadeo lento y «prrr».
 * - «Preguntarme algo» abre el chat (el panel del ADR-0004, sin cambios).
 * - Se oculta con el chat abierto (lo decide `Assistant`) y con el switch
 *   «Mostrar a Groot» apagado.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BAJA_FUERTE, grootContenido, type GrootAction, type GrootMode } from '@grootfolio/shared'
import { GrootAvatar } from './GrootAvatar'
import { useGroot } from './GrootProvider'
import { useGrootDatos } from './useGrootDatos'

/** Modo de cada pantalla. Solo Inicio abre la burbuja sola. */
function modeFor(pathname: string): { mode: GrootMode; autoOpen: boolean } {
  if (pathname.startsWith('/dashboard')) return { mode: 'resumen', autoOpen: true }
  if (pathname.startsWith('/assets/new')) return { mode: 'cargar', autoOpen: false }
  if (pathname.startsWith('/reports')) return { mode: 'reportes', autoOpen: false }
  if (pathname.startsWith('/content')) return { mode: 'contenido', autoOpen: false }
  if (pathname.startsWith('/profile-test')) return { mode: 'perfil', autoOpen: false }
  return { mode: 'resumen', autoOpen: false }
}

/** Sincroniza el modo de Groot con la pantalla. Va montado siempre en el layout. */
export function GrootRouteSync() {
  const { pathname } = useLocation()
  const { pantalla } = useGroot()
  useEffect(() => {
    const { mode, autoOpen } = modeFor(pathname)
    pantalla(mode, autoOpen)
  }, [pathname, pantalla])
  return null
}

export function Groot({ onOpenChat }: { onOpenChat: () => void }) {
  const g = useGroot()
  const navigate = useNavigate()
  const { datos, dayPct } = useGrootDatos(g.lastTx)

  if (!g.visible) return null

  const c = grootContenido(g.mode, datos, g.animoIdx)
  const bajaFuerte = dayPct !== null && dayPct <= BAJA_FUERTE

  const run = (a: GrootAction) => {
    switch (a.id) {
      case 'chat':
        onOpenChat()
        break
      case 'ver-activos':
        navigate('/assets')
        break
      case 'mi-resumen':
        g.decir('resumen')
        break
      case 'cargar-otro':
        navigate('/assets/new')
        break
      case 'abrir-contenido':
        navigate('/content')
        break
      case 'ver-asignacion':
        navigate('/profile-test/result')
        break
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-2.5">
      {g.open && (
        <div
          className="groot-bubble flex w-[330px] max-w-[calc(100vw-48px)] flex-col gap-[9px] border border-line bg-surface px-3.5 pb-3.5 pt-3 shadow-[0_10px_25px_rgba(15,23,42,.12)]"
          style={{ borderRadius: '16px 16px 4px 16px' }}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-brand-ink">Groot</span>
            <span className="flex-1 text-[12.5px] text-ink-3">{c.label}</span>
            <button
              type="button"
              onClick={g.cerrar}
              aria-label="Ocultar a Groot"
              className="-mr-1 grid h-7 w-7 place-items-center rounded-[7px] text-ink-3 transition-colors hover:bg-muted hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p aria-live="polite" className="text-[15px] font-medium leading-[1.4] text-ink [text-wrap:pretty]">
            {c.msg}
          </p>
          {c.sub && <p className="text-[13px] leading-[1.45] text-ink-2">{c.sub}</p>}
          {c.actions.length > 0 && (
            <div className="mt-0.5 flex flex-wrap justify-end gap-2">
              {c.actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => run(a)}
                  className={`h-[34px] rounded-lg px-3 text-[13px] font-semibold transition-colors ${
                    a.kind === 'pri'
                      ? 'bg-brand-500 text-white hover:bg-brand-600'
                      : 'border border-ctl bg-surface text-ink hover:bg-muted'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={g.tocar}
        aria-label="Groot: tocalo para otro mensaje"
        className="relative h-[68px] w-[68px] rounded-full border-[3px] border-surface bg-groot-ground shadow-[0_6px_16px_rgba(15,23,42,.2)] transition-transform hover:-translate-y-0.5"
      >
        <span className="absolute inset-0 flex items-end justify-center overflow-hidden rounded-full">
          <GrootAvatar mood={c.mood} pets={g.pets} size={62} />
        </span>
        {!g.open && bajaFuerte && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-[10px] border-2 border-surface bg-[#DC2626] px-1 font-mono text-[10.5px] text-white">
            ↓{Math.abs(dayPct!).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
          </span>
        )}
      </button>
    </div>
  )
}
