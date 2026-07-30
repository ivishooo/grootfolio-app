/**
 * Pantalla de cuenta suspendida (F6, /account/suspended). Se llega al recibir
 * 403 ACCOUNT_SUSPENDED en el login; el motivo y la fecha vienen por location.state.
 */
import { useLocation, useNavigate } from 'react-router-dom'

interface SuspendedState {
  reason?: string | null
  suspendedUntil?: string | null
}

export function AccountSuspendedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? {}) as SuspendedState

  const untilText = state.suspendedUntil
    ? `Vas a poder ingresar el ${new Date(state.suspendedUntil).toLocaleDateString('es-AR')}.`
    : 'La suspensión es indefinida.'

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl font-bold" style={{ color: '#DC2626', background: 'rgba(220,38,38,0.12)' }}>
          ⊘
        </div>
        <h1 className="mt-4 text-xl font-bold">Tu cuenta está suspendida</h1>
        {state.reason && (
          <div className="mx-auto mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#991b1b' }}>
            {state.reason}
          </div>
        )}
        <p className="mt-4 text-sm text-neutral-500">{untilText}</p>
        <p className="mt-2 text-sm text-neutral-500">
          Si creés que es un error, escribinos a{' '}
          <a href="mailto:soporte@grootfolio.app" className="font-semibold text-brand-500">soporte@grootfolio.app</a>.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-6 w-full rounded-xl border border-neutral-300 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Volver al login
        </button>
      </div>
    </div>
  )
}
