import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { registerInputSchema } from '@grootfolio/shared'
import { AuthShell, AuthField, AUTH_SUBMIT } from './AuthShell'

/** Registro (rediseño v2, Fase 6): mismo layout que el Login. */

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async () => {
    const result = registerInputSchema.safeParse({
      email,
      password,
      fullName: fullName.trim() || undefined,
    })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])))
      return
    }
    setErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      await register(result.data.email, result.data.password, result.data.fullName)
      navigate('/dashboard')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Creá tu cuenta" subtitle="Empezá a seguir tu portafolio.">
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <AuthField
          label="Nombre"
          optional
          autoComplete="name"
          placeholder="Tu nombre"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: '' })) }}
          error={errors.fullName}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })) }}
          error={errors.password}
        />
        {formError && <p className="rounded-lg bg-neg-soft px-3 py-2 text-center text-sm text-neg">{formError}</p>}
        <button type="submit" className={AUTH_SUBMIT} disabled={submitting || (!email && !password)}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <p className="m-0 text-center text-sm text-ink-2">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-ink hover:underline">
            Ingresá
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
