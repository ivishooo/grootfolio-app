import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { loginInputSchema } from '@grootfolio/shared'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async () => {
    const result = loginInputSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])))
      return
    }
    setErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const e = err as { code?: string; reason?: string | null; suspendedUntil?: string | null }
      if (e.code === 'ACCOUNT_SUSPENDED') {
        navigate('/account/suspended', { state: { reason: e.reason ?? null, suspendedUntil: e.suspendedUntil ?? null } })
        return
      }
      setFormError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 dark:bg-neutral-950">
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo variant="lockup" size={36} />
        </div>
        <h1 className="text-center text-2xl font-bold">Bienvenido de vuelta</h1>
        <p className="text-center text-sm text-neutral-500 mt-1">Ingresá a tu portafolio</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: '' })) }}
            error={errors.email}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })) }}
            error={errors.password}
          />
          {formError && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-center text-sm text-danger-600 dark:bg-danger-950/40">
              {formError}
            </p>
          )}
          <Button fullWidth onClick={handleSubmit} disabled={submitting || (!email && !password)}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <p className="text-center text-sm text-neutral-500">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-brand-500 hover:underline">
              Creála aquí
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
