/**
 * Perfil de inversor · test en mobile (rediseño v2, Fase 5). Espejo de la web:
 * «Pregunta N de M» con %, opciones de 52 con radio y «← Anterior» /
 * «Siguiente →» / «Ver mi perfil». Si ya hay perfil, va al resultado; con el
 * param `rehacer` arranca el test de nuevo.
 */
import { useEffect, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { useGroot } from '@/components/groot/GrootProvider'
import { useQuiz, useQuizResult, useSubmitQuiz } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { ErrorState, LoadingState } from '@/components/ui/States'

export function ProfileTestScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ProfileTest'>>()
  const route = useRoute<RouteProp<RootStackParamList, 'ProfileTest'>>()
  const groot = useGroot()
  const result = useQuizResult()
  const { data: questions, isLoading, isError, error, refetch } = useQuiz()
  const submitQuiz = useSubmitQuiz()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const retake = route.params?.rehacer === true

  // Con perfil ya calculado, esta pantalla es el resultado.
  useEffect(() => {
    if (result.data && !retake) nav.replace('ProfileResult')
  }, [result.data, retake, nav])

  if (isLoading || result.isLoading) return <LoadingState label="Cargando el test…" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'No se pudo cargar el test.'} onRetry={() => void refetch()} />
  if ((result.data && !retake) || !questions || questions.length === 0) return null

  const question = questions[step]!
  const progress = Math.round(((step + 1) / questions.length) * 100)
  const isLast = step + 1 >= questions.length
  const answered = Boolean(selected[question.id])

  const handleNext = () => {
    if (!answered) return
    if (!isLast) {
      setStep(step + 1)
      return
    }
    const answers = questions.map((q) => ({ questionId: q.id, optionId: selected[q.id]! }))
    submitQuiz.mutate(answers, {
      onSuccess: () => {
        groot.decir('perfil')
        nav.replace('ProfileResult')
      },
    })
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>Perfil de inversor</Text>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Pregunta {step + 1} de {questions.length}</Text>
            <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '600' }}>{progress} %</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.background.muted, overflow: 'hidden' }}>
            <View style={{ width: `${progress}%`, height: '100%', borderRadius: 3, backgroundColor: theme.brand.solid }} />
          </View>
        </View>

        <View style={{ backgroundColor: theme.background.surface, borderColor: theme.border.default, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ color: theme.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{question.text}</Text>
          {question.options.map((o) => {
            const on = selected[question.id] === o.id
            return (
              <TouchableOpacity
                key={o.id}
                testID="quiz-option"
                onPress={() => setSelected((p) => ({ ...p, [question.id]: o.id }))}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: on ? theme.brand.solid : theme.border.default,
                  backgroundColor: on ? theme.brand.tint : 'transparent',
                }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: on ? theme.brand.solid : theme.border.strong, backgroundColor: on ? theme.brand.solid : 'transparent' }}>
                  {on && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={{ flex: 1, color: theme.text.primary, fontSize: 14 }}>{o.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {submitQuiz.isError ? (
          <Text style={{ color: theme.trend.neg, fontSize: 13 }}>{submitQuiz.error instanceof Error ? submitQuiz.error.message : 'No se pudo guardar el test.'}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            disabled={step === 0 || submitQuiz.isPending}
            accessibilityRole="button"
            style={{ height: 48, paddingHorizontal: 18, borderRadius: 11, borderWidth: 1, borderColor: theme.border.strong, justifyContent: 'center', opacity: step === 0 ? 0.45 : 1 }}
          >
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>← Anterior</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="quiz-siguiente"
            onPress={handleNext}
            disabled={submitQuiz.isPending}
            accessibilityRole="button"
            accessibilityState={{ disabled: !answered }}
            style={{ flex: 1, height: 48, borderRadius: 11, backgroundColor: theme.brand.solid, alignItems: 'center', justifyContent: 'center', opacity: answered ? 1 : 0.45 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{isLast ? (submitQuiz.isPending ? 'Calculando…' : 'Ver mi perfil') : 'Siguiente →'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  )
}
