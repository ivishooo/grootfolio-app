/**
 * Acciones sobre una respuesta: volver a preguntar y votar si sirvió.
 *
 * Dos diferencias deliberadas con la web:
 *
 * 1. **Siempre visibles.** En la web aparecen al pasar el mouse; en un teléfono
 *    no hay hover, así que esconderlas sería esconderlas del todo.
 * 2. **Sin "copiar".** Copiar al portapapeles necesita `expo-clipboard`, una
 *    dependencia nativa nueva, y en un teléfono se puede seleccionar el texto.
 *    No vale un módulo nativo por la acción menos usada de las tres.
 *
 * El voto es lo que importa: se persiste junto al `retrieval_score` del mensaje
 * y es la señal para calibrar el umbral en F7.
 */
import { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useChatFeedback } from '@/lib/queries'
import { useAssistantTokens } from './tokens'

interface Props {
  messageId: string
  onRetry?: () => void
}

export function MessageActions({ messageId, onRetry }: Props) {
  const { theme } = useTheme()
  const t = useAssistantTokens()
  const [vote, setVote] = useState<1 | -1 | null>(null)
  const feedback = useChatFeedback()

  const sendVote = (value: 1 | -1) => {
    // Votar lo mismo dos veces lo desmarca; el backend guarda el último voto.
    const next = vote === value ? null : value
    setVote(next)
    if (next !== null) feedback.mutate({ messageId, vote: next })
  }

  const button = (label: string, active: boolean, onPress: () => void, glyph: string) => (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      // 40px de área de toque aunque el glifo sea chico.
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? t.accentSoft : 'transparent',
      }}
    >
      <Text style={{ fontSize: 15, color: active ? t.accentInk : theme.text.muted }}>{glyph}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 }}>
      {onRetry && button('Volver a preguntar', false, onRetry, '↻')}
      {button('Respuesta útil', vote === 1, () => sendVote(1), '👍')}
      {button('Respuesta no útil', vote === -1, () => sendVote(-1), '👎')}
      {vote !== null && (
        <Text style={{ color: theme.text.muted, fontSize: 12, marginLeft: 4 }}>Gracias</Text>
      )}
    </View>
  )
}
