import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { loginInputSchema } from '@grootfolio/shared'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = () => {
    const result = loginInputSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? '']))
      )
      return
    }
    setErrors({})
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
          <label className="block text-sm" htmlFor="login-email">
            <span className="mb-1 block font-medium">Email</span>
            <input
              id="login-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })) }}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
            />
            {errors.email && <p className="text-danger-500 text-xs mt-1">{errors.email}</p>}
          </label>
          <label className="block text-sm" htmlFor="login-password">
            <span className="mb-1 block font-medium">Contrasena</span>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })) }}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
            />
            {errors.password && <p className="text-danger-500 text-xs mt-1">{errors.password}</p>}
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!email && !password}
            className="w-full rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ingresar
          </button>
          <p className="text-center text-sm text-neutral-500">
            No tenes cuenta? <span className="text-brand-500 cursor-pointer">Creala aqui</span>
          </p>
        </form>
      </div>
    </div>
  )
}
