import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export function SettingsScreen() {
  const { theme } = useTheme()

  return (
    <View style={[s.container, { backgroundColor: theme.background.canvas }]}>
      <Text style={[s.title, { color: theme.text.primary }]}>Configuracion</Text>
      <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
        <Text style={{ color: theme.text.muted, textAlign: 'center' }}>Proximamente...</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  card: { padding: 24, borderWidth: 1, borderRadius: 18, alignItems: 'center' },
})
