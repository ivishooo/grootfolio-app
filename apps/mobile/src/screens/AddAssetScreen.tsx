/**
 * AddAsset mobile - segun Figma "03 - Add Asset - Mobile".
 * Completar en Fase 3.
 */
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'

export function AddAssetScreen() {
  const { theme } = useTheme()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>Cargar Activo</Text>
        {['Criptomonedas', 'Accion', 'Bono', 'Divisa'].map((label) => (
          <TouchableOpacity key={label} style={[s.tab, { borderColor: theme.border.default, backgroundColor: theme.background.surface }]}>
            <Text style={{ color: theme.text.primary, textAlign: 'center' }}>{label}</Text>
          </TouchableOpacity>
        ))}
        <View style={[s.card, { borderColor: theme.border.default, backgroundColor: theme.background.surface }]}>
          <TextInput placeholder="Ej: Bitcoin, Apple Inc..." placeholderTextColor={theme.text.muted} style={[s.input, { color: theme.text.primary, backgroundColor: theme.background.muted }]} />
          <TextInput placeholder="Monto invertido" placeholderTextColor={theme.text.muted} style={[s.input, { color: theme.text.primary, backgroundColor: theme.background.muted }]} />
          <TextInput placeholder="Precio de compra" placeholderTextColor={theme.text.muted} style={[s.input, { color: theme.text.primary, backgroundColor: theme.background.muted }]} />
          <TextInput placeholder="Fecha (dd/mm/yyyy)" placeholderTextColor={theme.text.muted} style={[s.input, { color: theme.text.primary, backgroundColor: theme.background.muted }]} />
          <TextInput placeholder="Notas" multiline placeholderTextColor={theme.text.muted} style={[s.input, { height: 80, color: theme.text.primary, backgroundColor: theme.background.muted }]} />
          <TouchableOpacity style={s.button}><Text style={{ color: '#fff', fontWeight: '600' }}>Guardar Activo</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  tab: { padding: 20, borderWidth: 1, borderRadius: 16 },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 10 },
  input: { padding: 12, borderRadius: 10 },
  button: { backgroundColor: '#F97316', padding: 14, borderRadius: 10, alignItems: 'center' },
})
