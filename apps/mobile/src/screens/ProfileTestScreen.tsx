import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useQuiz, useSubmitQuiz } from '@/lib/queries'
import { ErrorState, LoadingState } from '@/components/ui/States'

export function ProfileTestScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Main'>>()
  const { data: questions, isLoading, isError, error, refetch } = useQuiz()
  const submitQuiz = useSubmitQuiz()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>
        <LoadingState label="Cargando el cuestionario…" />
      </View>
    )
  }
  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el cuestionario.'}
          onRetry={() => void refetch()}
        />
      </View>
    )
  }
  if (!questions || questions.length === 0) return null

  const total = questions.length
  const current = questions[step]!
  const progress = ((step + 1) / total) * 100
  const currentSelected = selected[current.id]
  const isLast = step + 1 >= total

  const handleNext = () => {
    if (!currentSelected) return
    if (!isLast) {
      setStep(step + 1)
      return
    }
    const answers = questions.map((q) => ({ questionId: q.id, optionId: selected[q.id]! }))
    submitQuiz.mutate(answers, {
      onSuccess: () => nav.getParent()?.navigate('ProfileResult'),
    })
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

        {submitQuiz.isError && (
          <Text style={{ color: '#EF4444', fontSize: 13 }}>
            {submitQuiz.error instanceof Error ? submitQuiz.error.message : 'No se pudo calcular tu perfil.'}
          </Text>
        )}

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
            disabled={!currentSelected || submitQuiz.isPending}
            style={[s.btnPrimary, { backgroundColor: theme.brand.solid, opacity: currentSelected && !submitQuiz.isPending ? 1 : 0.5 }]}
          >
            <Text style={{ color: theme.text.onBrand, fontWeight: '600' }}>
              {isLast ? (submitQuiz.isPending ? 'Calculando…' : 'Finalizar') : 'Siguiente →'}
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
