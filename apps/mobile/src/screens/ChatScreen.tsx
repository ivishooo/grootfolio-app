/**
 * Asistente de GrootFolio en mobile (F6). Mismo contrato y mismas garantías que
 * la burbuja de la web:
 *  - si el bot no respondió con respaldo documental no se muestran fuentes;
 *  - las citas dicen de qué artículo y sección salió la respuesta.
 *
 * Se entra desde el botón del AppHeader, no desde un tab: el TabNavigator ya
 * tiene seis y Notificaciones ya resuelve su acceso de la misma forma.
 */
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ChatMessage } from '@grootfolio/shared'
import { useChatMessages, useSendChatMessage } from '@/lib/queries'
import { useTheme } from '@/theme/ThemeProvider'
import { Markdown } from '@/components/ui/Markdown'

const SUGERENCIAS = [
  '¿Cómo cargo una transacción?',
  '¿Qué es el P&L no realizado?',
  '¿Para qué sirve diversificar?',
]

function Sources({ message }: { message: ChatMessage }) {
  const { theme } = useTheme()
  if (!message.grounded || message.sources.length === 0) return null
  return (
    <View style={[styles.sources, { borderTopColor: theme.border.default }]}>
      <Text style={[styles.sourcesTitle, { color: theme.text.muted }]}>FUENTES</Text>
      {message.sources.map((source) => (
        <Text
          key={`${source.articleId}-${source.heading ?? ''}`}
          style={[styles.sourceItem, { color: theme.brand.solid }]}
        >
          {source.title}
          {source.heading ? ` › ${source.heading}` : ''}
        </Text>
      ))}
    </View>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const { theme } = useTheme()
  const mine = message.role === 'user'
  return (
    <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: theme.brand.solid }
            : { backgroundColor: theme.background.muted },
        ]}
      >
        {mine ? (
          <Text style={{ color: '#fff' }}>{message.content}</Text>
        ) : (
          <>
            <Markdown source={message.content} />
            <Sources message={message} />
          </>
        )}
      </View>
    </View>
  )
}

export function ChatScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** Pregunta recién enviada: el historial viene del servidor y tarda. */
  const [pending, setPending] = useState<string | null>(null)

  const { data: messages = [] } = useChatMessages(conversationId)
  const send = useSendChatMessage()
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages.length, send.isPending, pending])

  const ask = async (text: string) => {
    const message = text.trim()
    if (!message || send.isPending) return
    setDraft('')
    setError(null)
    setPending(message)
    try {
      const answer = await send.mutateAsync({
        message,
        ...(conversationId ? { conversationId } : {}),
      })
      setConversationId(answer.conversationId)
    } catch (err) {
      const code = (err as { code?: string })?.code
      setError(
        code === 'CHAT_RATE_LIMITED'
          ? 'Llegaste al límite de consultas por hora. Probá de nuevo más tarde.'
          : code === 'AI_UNAVAILABLE'
            ? 'El asistente no está disponible en este entorno.'
            : 'No pude responder ahora mismo. Intentá de nuevo en un rato.'
      )
      setDraft(message)
    } finally {
      setPending(null)
    }
  }

  const empty = messages.length === 0 && !send.isPending && !pending

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {empty && (
          <View style={{ gap: 12, paddingVertical: 8 }}>
            <Text style={{ color: theme.text.secondary, lineHeight: 20 }}>
              Preguntame sobre cómo usar GrootFolio o sobre los temas de inversión que
              documentamos. Si algo no está documentado, te lo voy a decir en vez de inventarlo.
            </Text>
            {SUGERENCIAS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => void ask(s)}
                style={[styles.suggestion, { borderColor: theme.border.default }]}
              >
                <Text style={{ color: theme.text.secondary }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}

        {pending && (
          <View style={[styles.row, { justifyContent: 'flex-end' }]}>
            <View style={[styles.bubble, { backgroundColor: theme.brand.solid, opacity: 0.7 }]}>
              <Text style={{ color: '#fff' }}>{pending}</Text>
            </View>
          </View>
        )}

        {send.isPending && (
          <View style={[styles.row, { justifyContent: 'flex-start' }]}>
            <View style={[styles.bubble, styles.thinking, { backgroundColor: theme.background.muted }]}>
              <ActivityIndicator size="small" color={theme.text.muted} />
              <Text style={{ color: theme.text.muted }}>Pensando…</Text>
            </View>
          </View>
        )}

        {error && (
          <Text style={[styles.error, { color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            borderTopColor: theme.border.default,
            backgroundColor: theme.background.surface,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribí tu consulta…"
          placeholderTextColor={theme.text.muted}
          maxLength={1000}
          multiline
          style={[
            styles.input,
            {
              backgroundColor: theme.background.muted,
              color: theme.text.primary,
              borderColor: theme.border.default,
            },
          ]}
          onSubmitEditing={() => void ask(draft)}
        />
        <TouchableOpacity
          onPress={() => void ask(draft)}
          disabled={!draft.trim() || send.isPending}
          style={[
            styles.sendBtn,
            { backgroundColor: theme.brand.solid, opacity: !draft.trim() || send.isPending ? 0.4 : 1 },
          ]}
        >
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sources: { marginTop: 8, borderTopWidth: 1, paddingTop: 8, gap: 2 },
  sourcesTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sourceItem: { fontSize: 12 },
  suggestion: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  error: { fontSize: 12, borderRadius: 8, padding: 10, overflow: 'hidden' },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 12 },
  input: { flex: 1, minHeight: 42, maxHeight: 110, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11 },
  sendBtn: { height: 42, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
})
