import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { loginInputSchema } from '@grootfolio/shared'
import { AuthShell, AuthField, AUTH_SUBMIT } from './AuthShell'

/**
 * Login (rediseño v2, Fase 6). «¿La olvidaste?» no se dibuja: la API no tiene
 * recuperación de contraseña y el SPEC pide no mostrar lo que no tiene backend.
 */

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
    <AuthShell title="Hola de nuevo" subtitle="Ingresá para ver tu portafolio.">
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })) }}
          error={errors.email}
        />
        <AuthField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })) }}
          error={errors.password}
        />
        {formError && <p className="rounded-lg bg-neg-soft px-3 py-2 text-center text-sm text-neg">{formError}</p>}
        <button type="submit" className={AUTH_SUBMIT} disabled={submitting || (!email && !password)}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="m-0 text-center text-sm text-ink-2">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-semibold text-brand-ink hover:underline">
            Creá una gratis
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
