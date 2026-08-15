/**
 * Composer del asistente.
 *
 * Lo que resuelve del diagnóstico (04 Affordance): antes el botón "Enviar" era
 * naranja al 40 % de opacidad, que se lee como deshabilitado incluso cuando se
 * puede enviar. Ahora tiene **estados reales**: gris cuando no hay nada que
 * mandar y naranja sólido cuando sí, sin opacidades intermedias.
 *
 * El disclaimer es fijo, no sólo de la bienvenida: la duda sobre qué puede
 * responder el bot aparece cuando ya está respondiendo.
 */
import { useState } from 'react'
import Svg, { Path } from 'react-native-svg'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAssistantTokens } from './tokens'

interface Props {
  onSend: (text: string) => void
  isStreaming: boolean
}

export function Composer({ onSend, isStreaming }: Props) {
  const { theme } = useTheme()
  const t = useAssistantTokens()
  const [draft, setDraft] = useState('')
  const canSend = !!draft.trim() && !isStreaming

  const submit = () => {
    if (!canSend) return
    onSend(draft)
    setDraft('')
  }

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border.default,
        backgroundColor: theme.background.surface,
        paddingHorizontal: 12,
        paddingTop: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          borderWidth: 1,
          borderColor: theme.border.default,
          borderRadius: 14,
          backgroundColor: theme.background.canvas,
          padding: 6,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Preguntá sobre GrootFolio…"
          placeholderTextColor={theme.text.placeholder}
          accessibilityLabel="Mensaje para el asistente"
          maxLength={1000}
          multiline
          // Crece hasta ~5 líneas y después hace scroll interno, como la web.
          style={{
            flex: 1,
            minHeight: 36,
            maxHeight: 116,
            color: theme.text.primary,
            fontSize: 14,
            lineHeight: 20,
            paddingHorizontal: 8,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          accessibilityState={{ disabled: !canSend }}
          onPress={submit}
          disabled={!canSend}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSend ? t.accentStrong : theme.background.muted,
          }}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 19V5M5 12l7-7 7 7"
              stroke={canSend ? '#fff' : theme.text.disabled}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <Text style={{ color: theme.text.muted, fontSize: 11, lineHeight: 15, paddingHorizontal: 4, marginTop: 6 }}>
        Respondo sobre GrootFolio y lo que el equipo documentó. No es asesoramiento financiero.
      </Text>
    </View>
  )
}
