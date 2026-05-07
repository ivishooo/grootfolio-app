import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleLogin = () => {
    login()
    navigate('/dashboard')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex justify-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-brand-500 grid place-items-center text-white font-bold">GF</div>
        </div>
        <h1 className="text-center text-2xl font-bold">Bienvenido de vuelta</h1>
        <p className="text-center text-sm text-neutral-500 mt-1">Ingresa a tu portfolio</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm">
            <span className="mb-1 block">Email</span>
            <input type="email" placeholder="tu@email.com" className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Contrasena</span>
            <input type="password" placeholder="••••••••" className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <button type="button" onClick={handleLogin} className="w-full rounded-lg bg-brand-500 py-2 font-medium text-white hover:bg-brand-600">
            Ingresar
          </button>
          <p className="text-center text-sm text-neutral-500">
            No tenes cuenta? <a href="#" className="text-brand-500">Creala aqui</a>
          </p>
        </form>
      </div>
    </div>
  )
}
