/**
 * 404. Antes cualquier ruta desconocida hacía `<Navigate to="/" replace />`, así
 * que un link viejo o una URL mal tipeada dejaba al usuario en el Dashboard sin
 * ninguna explicación, y encima borraba la URL original del historial.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="grid place-items-center py-20 text-center">
      <p className="text-5xl font-bold text-brand-500">404</p>
      <h1 className="mt-3 text-xl font-semibold">Esta página no existe</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        No encontramos nada en <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] dark:bg-neutral-800">{pathname}</code>.
        Puede que el link esté viejo o que la dirección tenga un error de tipeo.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate(-1)}>← Volver atrás</Button>
        <Link to="/dashboard">
          <Button variant="secondary">Ir al Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
