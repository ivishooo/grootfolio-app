/**
 * ProfileTest mobile - segun Figma "04 - Profile Test - Mobile".
 * Stub con progress bar + pregunta actual + 4 opciones. Logica real en Fase 3.
 */
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'

const mockQuestions = [
  {
    q: '¿Cual es tu horizonte temporal de inversion?',
    options: ['Menos de 1 ano', '1-3 anos', '3-7 anos', 'Mas de 7 anos'],
  },
  {
    q: 'Si tu portafolio cayera 20% en un mes, ¿que harias?',
    options: ['Vender todo', 'Vender una parte', 'Mantener', 'Comprar mas'],
  },
  {
    q: '¿Cual es tu experiencia previa invirtiendo?',
    options: ['Ninguna', 'Basica', 'Intermedia', 'Avanzada'],
  },
  {
    q: '¿Que porcentaje de tus ingresos destinas a invertir?',
    options: ['Menos de 5%', '5-15%', '15-30%', 'Mas de 30%'],
  },
]

export function ProfileTestScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [step, setStep] = useState(0)
  const total = mockQuestions.length
  const current = mockQuestions[step]
  const progress = ((step + 1) / total) * 100

  const onSelect = () => {
    if (step < total - 1) setStep(step + 1)
    else nav.replace('ProfileResult')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '700' }}>
            Test de Perfil de Inversor
          </Text>
          <Text style={{ color: theme.text.secondary, marginTop: 4 }}>
            Pregunta {step + 1} de {total}
          </Text>
        </View>

        <View style={[s.progressTrack, { backgroundColor: theme.background.muted }]}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            {current.q}
          </Text>
          {current.options.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={onSelect}
              style={[s.option, { borderColor: theme.border.default, backgroundColor: theme.background.muted }]}
            >
              <Text style={{ color: theme.text.primary }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)}>
            <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Volver</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 4 },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 10 },
  option: { padding: 14, borderWidth: 1, borderRadius: 12 },
})
