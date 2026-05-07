import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { brand } from '@grootfolio/tokens'

export function AppHeader() {
  const { theme, themeName, toggleTheme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: theme.background.surface, borderBottomColor: theme.border.default }]}>
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>GF</Text>
          </View>
          <Text style={[styles.title, { color: theme.text.primary }]}>GrootFolio</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={[styles.toggleBtn, { backgroundColor: theme.background.muted }]}>
          <Text style={{ fontSize: 18 }}>{themeName === 'light' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: 1 },
  inner: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { height: 32, width: 32, borderRadius: 10, backgroundColor: brand[500], alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  toggleBtn: { height: 36, width: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
