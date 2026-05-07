/**
 * Login - segun Figma "01 - Login - Mobile".
 * Stub listo para ampliar (ver docs/CLAUDE_CODE_PLAN.md, Fase 3).
 */
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'

export function LoginScreen() {
  const { theme } = useTheme()
  const { login } = useAuth()
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background.canvas }]}>
      <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
        <View style={[s.logo, { backgroundColor: '#F97316' }]}><Text style={s.logoText}>GF</Text></View>
        <Text style={[s.title, { color: theme.text.primary }]}>Bienvenido de vuelta</Text>
        <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Ingresa a tu portfolio</Text>
        <TextInput placeholder="tu@email.com" placeholderTextColor={theme.text.muted} style={[s.input, { backgroundColor: theme.background.muted, color: theme.text.primary }]} />
        <TextInput placeholder="Contrasena" secureTextEntry placeholderTextColor={theme.text.muted} style={[s.input, { backgroundColor: theme.background.muted, color: theme.text.primary }]} />
        <TouchableOpacity style={s.button} onPress={login}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Ingresar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 24, gap: 14 },
  logo: { alignSelf: 'center', width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  input: { padding: 12, borderRadius: 10 },
  button: { backgroundColor: '#F97316', padding: 14, borderRadius: 10, alignItems: 'center' },
})
