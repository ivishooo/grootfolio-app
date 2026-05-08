import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { loginInputSchema } from '@grootfolio/shared'

export function LoginScreen() {
  const { theme } = useTheme()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleLogin = () => {
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
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background.canvas }]}>
      <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
        <View style={[s.logo, { backgroundColor: theme.brand.solid }]}>
          <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>GF</Text>
        </View>
        <Text style={[s.title, { color: theme.text.primary }]}>Bienvenido de vuelta</Text>
        <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Ingresa a tu portfolio</Text>

        <TextInput
          placeholder="tu@email.com"
          placeholderTextColor={theme.text.placeholder}
          value={email}
          onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: '' })) }}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[s.input, { backgroundColor: theme.background.muted, color: theme.text.primary, borderColor: errors.email ? theme.danger.solid : 'transparent', borderWidth: 1 }]}
        />
        {errors.email ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{errors.email}</Text> : null}

        <TextInput
          placeholder="Contrasena"
          placeholderTextColor={theme.text.placeholder}
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: '' })) }}
          secureTextEntry
          style={[s.input, { backgroundColor: theme.background.muted, color: theme.text.primary, borderColor: errors.password ? theme.danger.solid : 'transparent', borderWidth: 1 }]}
        />
        {errors.password ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{errors.password}</Text> : null}

        <TouchableOpacity
          style={[s.button, { backgroundColor: theme.brand.solid, opacity: !email && !password ? 0.5 : 1 }]}
          onPress={handleLogin}
          disabled={!email && !password}
        >
          <Text style={{ color: theme.text.onBrand, fontWeight: '600' }}>Ingresar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 24, gap: 14 },
  logo: { alignSelf: 'center', width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  input: { padding: 12, borderRadius: 10 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center' },
})
