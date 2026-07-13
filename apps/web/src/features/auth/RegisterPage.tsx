import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { registerInputSchema } from '@grootfolio/shared'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

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
    <div className="grid min-h-screen place-items-center bg-neutral-50 dark:bg-neutral-950">
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-brand-500 grid place-items-center text-white font-bold">GF</div>
        </div>
        <h1 className="text-center text-2xl font-bold">Creá tu cuenta</h1>
        <p className="text-center text-sm text-neutral-500 mt-1">Empezá a seguir tu portafolio</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Nombre (opcional)"
            placeholder="Tu nombre"
            value={fullName}
            onChange={(v) => { setFullName(v); setErrors((p) => ({ ...p, fullName: '' })) }}
            error={errors.fullName}
          />
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
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
          <p className="text-center text-sm text-neutral-500">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-brand-500 hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
