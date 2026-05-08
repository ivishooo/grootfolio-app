import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import type { QuizQuestion } from '@grootfolio/shared'

const mockQuiz: QuizQuestion[] = [
  {
    id: 'q1', order: 1,
    text: 'Que experiencia previa tenes en inversiones?',
    options: [
      { id: 'q1-o1', label: 'No tengo experiencia en inversiones', score: 1 },
      { id: 'q1-o2', label: 'Invierto en plazo fijo', score: 2 },
      { id: 'q1-o3', label: 'Invierto en bonos, letras u obligaciones negociables', score: 3 },
      { id: 'q1-o4', label: 'Invierto en acciones', score: 4 },
      { id: 'q1-o5', label: 'Invierto en instrumentos como CFD, futuros u opciones', score: 5 },
    ],
  },
  {
    id: 'q2', order: 2,
    text: 'Cual es tu horizonte de inversion?',
    options: [
      { id: 'q2-o1', label: 'Menos de 1 ano', score: 1 },
      { id: 'q2-o2', label: 'Entre 1 y 3 anos', score: 2 },
      { id: 'q2-o3', label: 'Entre 3 y 5 anos', score: 3 },
      { id: 'q2-o4', label: 'Mas de 5 anos', score: 4 },
    ],
  },
  {
    id: 'q3', order: 3,
    text: 'Como reaccionarias ante una caida del 20% en tu portafolio?',
    options: [
      { id: 'q3-o1', label: 'Vendo todo para evitar perder mas', score: 1 },
      { id: 'q3-o2', label: 'Vendo una parte para limitar perdidas', score: 2 },
      { id: 'q3-o3', label: 'Mantengo posiciones y espero', score: 3 },
      { id: 'q3-o4', label: 'Compro mas aprovechando los precios bajos', score: 4 },
    ],
  },
  {
    id: 'q4', order: 4,
    text: 'Que porcentaje de tus ingresos pensas invertir?',
    options: [
      { id: 'q4-o1', label: 'Menos del 10%', score: 1 },
      { id: 'q4-o2', label: 'Entre 10% y 25%', score: 2 },
      { id: 'q4-o3', label: 'Entre 25% y 50%', score: 3 },
      { id: 'q4-o4', label: 'Mas del 50%', score: 4 },
    ],
  },
]

export function ProfileTestScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Main'>>()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const total = mockQuiz.length
  const current = mockQuiz[step]!
  const progress = ((step + 1) / total) * 100
  const currentSelected = selected[current.id]

  const handleNext = () => {
    if (!currentSelected) return
    if (step < total - 1) setStep(step + 1)
    else nav.getParent()?.navigate('ProfileResult')
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>
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
          <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: theme.brand.solid }]} />
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            {current.text}
          </Text>
          {current.options.map((opt) => {
            const isSelected = currentSelected === opt.id
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelected({ ...selected, [current.id]: opt.id })}
                style={[
                  s.option,
                  {
                    borderColor: isSelected ? theme.brand.solid : theme.border.default,
                    backgroundColor: isSelected ? theme.brand.subtle : theme.background.muted,
                  },
                ]}
              >
                <View style={[s.radio, isSelected ? { backgroundColor: theme.brand.solid } : { borderColor: theme.border.strong, borderWidth: 1 }]}>
                  {isSelected && <Text style={{ color: theme.text.onBrand, fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={{ color: theme.text.primary, flex: 1 }}>{opt.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {step > 0 && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              style={[s.btnSecondary, { borderColor: theme.border.default }]}
            >
              <Text style={{ color: theme.text.secondary }}>← Anterior</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={!currentSelected}
            style={[s.btnPrimary, { backgroundColor: theme.brand.solid, opacity: currentSelected ? 1 : 0.5 }]}
          >
            <Text style={{ color: theme.text.onBrand, fontWeight: '600' }}>
              {step + 1 < total ? 'Siguiente →' : 'Finalizar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 10 },
  option: { padding: 14, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
})
