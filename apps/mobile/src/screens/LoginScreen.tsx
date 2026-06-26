import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { loginInputSchema } from '@grootfolio/shared'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'

export function LoginScreen() {
  const { theme } = useTheme()
  const { login } = useAuth()
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
      setFormError(err instanceof Error ? err.message : 'No se pudo iniciar sesion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background.canvas }]}>
      <Card padding="lg">
        <View style={{ gap: 14 }}>
          <View style={[s.logo, { backgroundColor: theme.brand.solid }]}>
            <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>GF</Text>
          </View>
          <Text style={[s.title, { color: theme.text.primary }]}>Bienvenido de vuelta</Text>
          <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Ingresa a tu portfolio</Text>

          <FormField
            testID="login-email"
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChange={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: '' })) }}
            error={errors.email}
            keyboard="email-address"
          />
          <FormField
            testID="login-password"
            label="Contrasena"
            placeholder="••••••••"
            value={password}
            onChange={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: '' })) }}
            error={errors.password}
            secureTextEntry
          />
          {formError && (
            <Text style={{ color: '#EF4444', textAlign: 'center', fontSize: 13 }}>{formError}</Text>
          )}
          <Button testID="login-submit" fullWidth onPress={handleLogin} disabled={submitting || (!email && !password)}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </View>
      </Card>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', padding: 20 },
  logo: { alignSelf: 'center', width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8 },
})
