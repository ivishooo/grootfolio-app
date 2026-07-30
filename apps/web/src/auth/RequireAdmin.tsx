/**
 * Guarda de rutas de administración (F5). Redirige al dashboard si el usuario
 * autenticado no es admin. Va anidada dentro de ProtectedRoute + AppLayout.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
