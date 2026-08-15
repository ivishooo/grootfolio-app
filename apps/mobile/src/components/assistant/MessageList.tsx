/**
 * Lista de mensajes. Mismas dos reglas que la web:
 *
 *  - el autoscroll sólo baja si el usuario ya estaba cerca del fondo, para no
 *    arrancarle la lectura de una respuesta larga cuando llega la siguiente;
 *  - los mensajes van separados por día, porque una conversación retomada al
 *    otro día se lee como un bloque continuo si no se marca dónde cortó.
 */
import { Fragment, useRef, type ReactNode } from 'react'
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import type { ChatMessage } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import { ErrorBubble, MessageBubble, UserBubble } from './MessageBubble'
import { MessageActions } from './MessageActions'
import { SourceChips } from './SourceChips'
import { TypingDots } from './TypingDots'

const AUTOSCROLL_THRESHOLD_PX = 80

/** Etiqueta del separador: "Hoy", "Ayer" o la fecha larga. */
function dayLabel(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

function DaySeparator({ label }: { label: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.default }} />
      <Text style={{ color: theme.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.default }} />
    </View>
  )
}

interface Props {
  messages: ChatMessage[]
  pending: string | null
  isStreaming: boolean
  error: string | null
  onRetry?: () => void
  onRetryMessage?: (index: number) => void
  empty: ReactNode
}

export function MessageList({
  messages,
  pending,
  isStreaming,
  error,
  onRetry,
  onRetryMessage,
  empty,
}: Props) {
  const scrollRef = useRef<ScrollView>(null)
  const stickToBottom = useRef(true)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    stickToBottom.current =
      contentSize.height - contentOffset.y - layoutMeasurement.height < AUTOSCROLL_THRESHOLD_PX
  }

  const isEmpty = messages.length === 0 && !pending && !isStreaming && !error

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={64}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        if (stickToBottom.current) scrollRef.current?.scrollToEnd({ animated: true })
      }}
      contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
    >
      {isEmpty && empty}

      {messages.map((message, index) => {
        const label = dayLabel(message.createdAt)
        const previous = messages[index - 1]
        // Se muestra en el primer mensaje y cada vez que cambia el día.
        const showSeparator = label !== null && (!previous || label !== dayLabel(previous.createdAt))

        return (
          <Fragment key={message.id}>
            {showSeparator && <DaySeparator label={label} />}
            <MessageBubble message={message}>
              <SourceChips message={message} />
              {message.role === 'assistant' && (
                <MessageActions
                  messageId={message.id}
                  onRetry={onRetryMessage ? () => onRetryMessage(index) : undefined}
                />
              )}
            </MessageBubble>
          </Fragment>
        )
      })}

      {pending && <UserBubble content={pending} muted />}
      {isStreaming && <TypingDots />}
      {error && <ErrorBubble message={error} onRetry={onRetry} />}
    </ScrollView>
  )
}
