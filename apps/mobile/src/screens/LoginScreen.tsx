import { useState } from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { loginInputSchema } from '@grootfolio/shared'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { FormField } from '@/components/ui/FormField'
import { AuthLayout, AuthSubmit } from './AuthLayout'

/**
 * Login mobile (rediseño v2, Fase 6). «¿La olvidaste?» no se dibuja: la API no
 * tiene recuperación de contraseña.
 */
export function LoginScreen() {
  const { theme } = useTheme()
  const { login } = useAuth()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async () => {
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
    } catch (err) {
      const e = err as { code?: string; reason?: string | null; suspendedUntil?: string | null }
      if (e.code === 'ACCOUNT_SUSPENDED') {
        nav.navigate('AccountSuspended', {
          reason: e.reason ?? null,
          suspendedUntil: e.suspendedUntil ?? null,
        })
        return
      }
      setFormError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Hola de nuevo" subtitle="Ingresá para ver tu portafolio.">
      <FormField
        testID="login-email"
        label="Email"
        placeholder="tu@email.com"
        value={email}
        onChange={(t) => {
          setEmail(t)
          setErrors((p) => ({ ...p, email: '' }))
        }}
        error={errors.email}
        keyboard="email-address"
        height={48}
      />
      <FormField
        testID="login-password"
        label="Contraseña"
        value={password}
        onChange={(t) => {
          setPassword(t)
          setErrors((p) => ({ ...p, password: '' }))
        }}
        error={errors.password}
        secureTextEntry
        height={48}
      />
      {formError && <Text style={{ color: theme.trend.neg, textAlign: 'center', fontSize: 13 }}>{formError}</Text>}
      <AuthSubmit testID="login-submit" onPress={handleLogin} disabled={submitting || (!email && !password)}>
        {submitting ? 'Ingresando…' : 'Ingresar'}
      </AuthSubmit>
      <TouchableOpacity testID="login-registrarse" onPress={() => nav.navigate('Register')} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: theme.text.secondary, fontSize: 14, textAlign: 'center' }}>
          ¿No tenés cuenta? <Text style={{ color: theme.brand.ink, fontWeight: '600' }}>Creá una gratis</Text>
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  )
}
