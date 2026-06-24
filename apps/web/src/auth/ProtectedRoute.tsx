import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  // Mientras recuperamos la sesion (/me) no decidimos: evita un parpadeo al
  // login al recargar una ruta protegida con un token valido en storage.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-500" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
