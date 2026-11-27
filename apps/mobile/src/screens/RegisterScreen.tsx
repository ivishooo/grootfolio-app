/** Registro mobile (rediseño v2, Fase 6): mismo layout que el Login. */
import { useState } from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { registerInputSchema } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { FormField } from '@/components/ui/FormField'
import { AuthLayout, AuthSubmit } from './AuthLayout'

export function RegisterScreen() {
  const { theme } = useTheme()
  const { register } = useAuth()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleRegister = async () => {
    const result = registerInputSchema.safeParse({ email, password, fullName: fullName.trim() || undefined })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])))
      return
    }
    setErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      // Al quedar autenticado, RootNavigator cambia solo al stack de la app.
      await register(result.data.email, result.data.password, result.data.fullName)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Creá tu cuenta" subtitle="Empezá a seguir tu portafolio.">
      <FormField
        testID="register-name"
        label="Nombre"
        optional
        placeholder="Tu nombre"
        value={fullName}
        onChange={(t) => { setFullName(t); setErrors((p) => ({ ...p, fullName: '' })) }}
        error={errors.fullName}
        height={48}
      />
      <FormField
        testID="register-email"
        label="Email"
        placeholder="tu@email.com"
        value={email}
        onChange={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: '' })) }}
        error={errors.email}
        keyboard="email-address"
        height={48}
      />
      <FormField
        testID="register-password"
        label="Contraseña"
        value={password}
        onChange={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: '' })) }}
        error={errors.password}
        secureTextEntry
        height={48}
      />
      {formError && <Text style={{ color: theme.trend.neg, textAlign: 'center', fontSize: 13 }}>{formError}</Text>}
      <AuthSubmit testID="register-submit" onPress={handleRegister} disabled={submitting || (!email && !password)}>
        {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </AuthSubmit>
      <TouchableOpacity testID="register-ingresar" onPress={() => nav.goBack()} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: theme.text.secondary, fontSize: 14, textAlign: 'center' }}>
          ¿Ya tenés cuenta? <Text style={{ color: theme.brand.ink, fontWeight: '600' }}>Ingresá</Text>
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  )
}
