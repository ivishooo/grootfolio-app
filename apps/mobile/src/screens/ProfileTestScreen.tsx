/**
 * Test de perfil mobile (rediseño GF) — espejo del ProfileTestPage de web.
 * Barra de progreso con %, opciones tipo radio con acento naranja y check, y
 * resumen del perfil actual con badge/pill por perfil. Conserva los hooks.
 */
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RiskProfileType } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useQuiz, useQuizResult, useSubmitQuiz } from '@/lib/queries'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { ProfileIcon } from '@/components/ui/icons'

const labels: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

const PROFILE_COLOR: Record<RiskProfileType, { accent: string; soft: string }> = {
  conservative: { accent: '#3B82F6', soft: 'rgba(59,130,246,0.14)' },
  moderate: { accent: '#F97316', soft: 'rgba(249,115,22,0.14)' },
  aggressive: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.14)' },
}

const OPTION_ACCENT = '#F97316'
const OPTION_SOFT = 'rgba(249,115,22,0.10)'

export function ProfileTestScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Main'>>()
  const result = useQuizResult()
  const { data: questions, isLoading, isError, error, refetch } = useQuiz()
  const submitQuiz = useSubmitQuiz()
  const [retake, setRetake] = useState(false)
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})

  if (isLoading || result.isLoading) {
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

  // Ya tiene perfil y no eligió rehacer: resumen del perfil actual.
  if (result.data && !retake) {
    const pc = PROFILE_COLOR[result.data.profile]
    return (
      <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Text style={{ color: theme.text.primary, fontSize: 22, fontWeight: '800' }}>Test de Perfil</Text>
          <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default, alignItems: 'center' }]}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: pc.soft, alignItems: 'center', justifyContent: 'center' }}>
              <ProfileIcon profile={result.data.profile} color={pc.accent} size={34} />
            </View>
            <Text style={{ color: theme.text.secondary, marginTop: 12 }}>Tu perfil de inversor es</Text>
            <View style={{ backgroundColor: pc.soft, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 7, marginTop: 8 }}>
              <Text style={{ color: pc.accent, fontSize: 17, fontWeight: '800' }}>{labels[result.data.profile]}</Text>
            </View>
            <Text style={{ color: theme.text.secondary, textAlign: 'center', lineHeight: 20, marginTop: 12 }}>
              {result.data.description}
            </Text>
          </View>
          <TouchableOpacity style={[s.btnPrimary, { backgroundColor: theme.brand.solid }]} onPress={() => nav.getParent()?.navigate('ProfileResult')}>
            <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>Ver detalle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnSecondaryFull, { borderColor: theme.border.default }]}
            onPress={() => { setRetake(true); setStep(0); setSelected({}) }}
          >
            <Text style={{ color: theme.text.secondary, fontWeight: '600' }}>Volver a hacer el test</Text>
          </TouchableOpacity>
        </ScrollView>
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
          <Text style={{ color: theme.text.primary, fontSize: 22, fontWeight: '800' }}>Test de Perfil</Text>
          <Text style={{ color: theme.text.secondary, marginTop: 2, fontSize: 13 }}>
            Descubrí tu perfil de inversor y una asignación sugerida.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text.secondary, fontSize: 13 }}>Pregunta {step + 1} de {total}</Text>
            <Text style={{ color: theme.brand.solid, fontSize: 13, fontWeight: '700' }}>{Math.round(progress)}% completado</Text>
          </View>
          <View style={[s.progressTrack, { backgroundColor: theme.background.muted }]}>
            <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: theme.brand.solid }]} />
          </View>
        </View>

        <View style={[s.card, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
          <Text style={{ color: theme.text.primary, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
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
                    borderColor: isSelected ? OPTION_ACCENT : theme.border.default,
                    backgroundColor: isSelected ? OPTION_SOFT : 'transparent',
                  },
                ]}
              >
                <View style={[s.radio, isSelected ? { backgroundColor: theme.brand.solid } : { borderColor: theme.border.strong, borderWidth: 1.5 }]}>
                  {isSelected ? <Text style={{ color: theme.text.onBrand, fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
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
              disabled={submitQuiz.isPending}
              style={[s.btnSecondary, { borderColor: theme.border.default }]}
            >
              <Text style={{ color: theme.text.secondary }}>← Anterior</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={!currentSelected || submitQuiz.isPending}
            style={[s.btnPrimary, { flex: 1, backgroundColor: theme.brand.solid, opacity: currentSelected && !submitQuiz.isPending ? 1 : 0.5 }]}
          >
            <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>
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
  card: { padding: 18, borderWidth: 1, borderRadius: 18, gap: 10 },
  option: { padding: 15, borderWidth: 1.5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  btnSecondaryFull: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnPrimary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
})
